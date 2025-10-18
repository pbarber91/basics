// app/admin/courses/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Params = Promise<{ id: string }>;

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email) redirect("/signin");

  // derive role without using `any`
  type SafeUser = { role?: "USER" | "LEADER" | "ADMIN" };
  const role = ((session.user ?? {}) as SafeUser).role ?? "USER";
  if (role !== "ADMIN" && role !== "LEADER") redirect("/forbidden");

  // Load course with counts we need
  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      isPublished: true,
      _count: {
        select: {
          sessions: true,
          enrollments: true,
        },
      },
      sessions: {
        orderBy: { index: "asc" },
        select: { id: true, index: true, title: true },
      },
    },
  });

  if (!course) {
    redirect("/admin/courses");
  }

  // Cells = (# sessions) * (# enrollments)
  const totalCells =
    (course._count.sessions ?? 0) * (course._count.enrollments ?? 0);

  // ✅ Count progress rows for this course by filtering through the relation
  // Progress -> courseSession -> courseId
  const completedCells =
    totalCells > 0
      ? await prisma.progress.count({
          where: { courseSession: { courseId: course.id } },
        })
      : 0;

  const completionPct =
    totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0;

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Course</CardTitle>
            <p className="text-sm text-muted-foreground">{course.title}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/courses">
              <Button variant="outline" size="sm">
                All courses
              </Button>
            </Link>
            <Link href={`/courses/${course.slug}`}>
              <Button size="sm">View public page</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Stat label="Sessions" value={course._count.sessions} />
          <Stat label="Enrollments" value={course._count.enrollments} />
          <Stat label="Completed cells" value={completedCells} />
          <Stat label="Completion" value={`${completionPct}%`} />
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {course.sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
            >
              <div>
                <div className="text-sm uppercase tracking-wide text-muted-foreground">
                  Week {s.index}
                </div>
                <div className="font-medium">{s.title}</div>
              </div>
              <Link href={`/courses/${course.slug}/${s.index}`}>
                <Button size="sm">Open</Button>
              </Link>
            </div>
          ))}
          {course.sessions.length === 0 && (
            <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              No sessions yet.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
