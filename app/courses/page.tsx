// app/courses/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Role = "USER" | "LEADER" | "ADMIN";

type CourseCard = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  thumbnail: string | null;
  isPublished: boolean;
  _count: { sessions: number; enrollments: number };
};

export default async function CoursesIndexPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  const role: Role = ((session.user ?? {}) as { role?: Role }).role ?? "USER";

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!me) redirect("/signin");

  let courses: CourseCard[] = [];

  if (role === "ADMIN" || role === "LEADER") {
    courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        thumbnail: true,
        isPublished: true,
        _count: { select: { sessions: true, enrollments: true } },
      },
    });
  } else {
    const ids = await prisma.enrollment.findMany({
      where: { userId: me.id, status: "ACTIVE" },
      select: { courseId: true },
    });
    const courseIds = ids.map((e) => e.courseId);
    if (courseIds.length) {
      courses = await prisma.course.findMany({
        where: { id: { in: courseIds }, isPublished: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          thumbnail: true,
          isPublished: true,
          _count: { select: { sessions: true, enrollments: true } },
        },
      });
    }
  }

  // ===== build per-course progress for *this* user without relying on courseId in Progress
  const courseIds = courses.map((c) => c.id);
  const progressByCourse: Record<string, number> = {};

  if (courseIds.length) {
    const courseSessions = await prisma.session.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true, courseId: true },
    });

    // Map: courseId -> Set<sessionId>
    const byCourse = new Map<string, string[]>();
    const allSessionIds: string[] = [];
    for (const s of courseSessions) {
      allSessionIds.push(s.id);
      const arr = byCourse.get(s.courseId) ?? [];
      arr.push(s.id);
      byCourse.set(s.courseId, arr);
    }

    if (allSessionIds.length) {
      const userProgress = await prisma.progress.findMany({
        where: { userId: me.id, sessionId: { in: allSessionIds } },
        select: { sessionId: true },
      });

      // Invert: sessionId -> courseId
      const sessionToCourse = new Map<string, string>();
      for (const s of courseSessions) sessionToCourse.set(s.id, s.courseId);

      for (const p of userProgress) {
        const cid = sessionToCourse.get(p.sessionId);
        if (!cid) continue;
        progressByCourse[cid] = (progressByCourse[cid] ?? 0) + 1;
      }
    }
  }
  // ===== end aggregation

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Courses</CardTitle>
          {(role === "ADMIN" || role === "LEADER") && (
            <Link href="/admin/courses">
              <Button size="sm" variant="outline">Manage</Button>
            </Link>
          )}
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const completed = progressByCourse[c.id] ?? 0;
            const total = c._count.sessions || 0;
            const pct = total ? Math.round((completed / total) * 100) : 0;

            return (
              <article key={c.id} className="overflow-hidden rounded-xl border border-border bg-background">
                {c.thumbnail ? (
                  <img src={c.thumbnail} alt="" className="h-40 w-full object-cover" />
                ) : (
                  <div className="h-40 w-full bg-muted" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold">{c.title}</h3>
                    {(role === "ADMIN" || role === "LEADER") && !c.isPublished && (
                      <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">Draft</span>
                    )}
                  </div>

                  {c.summary && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.summary}</p>
                  )}

                  <div className="mt-3">
                    <div className="h-2 w-full rounded bg-muted">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{ width: `${pct}%` }}
                        aria-label={`Progress ${pct}%`}
                      />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {completed}/{total} sessions • {pct}%
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <Link href={`/courses/${c.slug}`}>
                      <Button size="sm">{completed ? "Continue" : "View course"}</Button>
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {c._count.sessions} session{c._count.sessions === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}

          {courses.length === 0 && (
            <div className="col-span-full rounded-xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
              You don’t have access to any courses yet. An Admin or Leader will enroll you.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
