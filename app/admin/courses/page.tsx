// app/admin/courses/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Role = "USER" | "LEADER" | "ADMIN";

export default async function AdminCoursesPage() {
  const session = await auth();
  const role: Role = ((session?.user ?? {}) as { role?: Role }).role ?? "USER";
  if (!session?.user?.email || (role !== "ADMIN" && role !== "LEADER")) {
    redirect("/forbidden");
  }

  // Load courses with counts
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      isPublished: true,
      _count: { select: { sessions: true, enrollments: true } },
    },
  });

  // ===== compute completion across all users WITHOUT assuming courseId exists on SessionWhereInput
  const courseIds = courses.map((c) => c.id);
  let completedByCourse: Record<string, number> = {};

  if (courseIds.length) {
    // Filter sessions by the relation (course.id IN ...), not by a raw courseId field
    const sessions = await prisma.session.findMany({
      where: { course: { id: { in: courseIds } } },
      select: {
        id: true,
        course: { select: { id: true } }, // read course id via relation
      },
    });

    const sessionToCourse = new Map<string, string>();
    const allSessionIds: string[] = [];
    for (const s of sessions) {
      const cid = s.course.id;
      sessionToCourse.set(s.id, cid);
      allSessionIds.push(s.id);
    }

    if (allSessionIds.length) {
      const allProgress = await prisma.progress.findMany({
        where: { sessionId: { in: allSessionIds } },
        select: { sessionId: true },
      });

      // Count progress rows per course
      const tally: Record<string, number> = {};
      for (const p of allProgress) {
        const cid = sessionToCourse.get(p.sessionId);
        if (!cid) continue;
        tally[cid] = (tally[cid] ?? 0) + 1;
      }
      completedByCourse = tally;
    }
  }
  // ===== end aggregation

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Courses</CardTitle>
          <Link href="/admin">
            <Button size="sm" variant="outline">Back to Admin</Button>
          </Link>
        </CardHeader>

        <CardContent className="grid gap-3">
          {courses.length === 0 ? (
            <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              No courses yet.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-background">
              {courses.map((c) => {
                const totalCells = c._count.sessions * c._count.enrollments;
                const completed = completedByCourse[c.id] ?? 0;
                const pct = totalCells ? Math.round((completed / totalCells) * 100) : 0;

                return (
                  <li
                    key={c.id}
                    className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/courses/${c.slug}`} className="font-medium hover:underline">
                          {c.title}
                        </Link>
                        {!c.isPublished && (
                          <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
                            Draft
                          </span>
                        )}
                      </div>
                      {c.summary && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {c.summary}
                        </div>
                      )}

                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                        <div>Sessions: {c._count.sessions}</div>
                        <div>Enrollments: {c._count.enrollments}</div>
                        <div>Completion: {pct}%</div>
                      </div>

                      <div className="mt-2 h-2 w-full rounded bg-muted">
                        <div
                          className="h-2 rounded bg-primary"
                          style={{ width: `${pct}%` }}
                          aria-label={`Completion ${pct}%`}
                        />
                      </div>
                    </div>
                    <div className="flex items-start justify-start gap-2 sm:justify-end">
                      <Link href={`/admin/enroll?course=${encodeURIComponent(c.slug)}`}>
                        <Button size="sm" variant="outline">Manage Enrollments</Button>
                      </Link>
                      <Link href={`/admin/courses/${c.id}`}>
                        <Button size="sm" variant="ghost">Details</Button>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
