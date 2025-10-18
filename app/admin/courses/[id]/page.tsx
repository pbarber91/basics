// app/admin/courses/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

type Role = "ADMIN" | "LEADER" | "USER";

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // --- Gate: ADMIN / LEADER only ---
  const session = await auth();
  const role: Role = ((session?.user as Record<string, unknown> | undefined)?.[
    "role"
  ] as Role | undefined) ?? "USER";
  if (!session?.user?.email || (role !== "ADMIN" && role !== "LEADER")) {
    redirect("/signin");
  }

  const { id } = await params;

  // Load course + light relations
  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      isPublished: true,
      createdAt: true,
      _count: {
        select: { sessions: true, enrollments: true },
      },
      sessions: {
        orderBy: { index: "asc" },
        select: { id: true, index: true, title: true },
      },
    },
  });

  if (!course) redirect("/admin/courses");

  // Progress grid math
  const totalCells =
    (course._count.sessions ?? 0) * (course._count.enrollments ?? 0);

  // ❗ FIX: Progress is tied to course via courseId (no `session` relation).
  const completedCells = totalCells
    ? await prisma.progress.count({ where: { courseId: course.id } })
    : 0;

  const completionPct = totalCells
    ? Math.round((completedCells / totalCells) * 100)
    : 0;

  return (
    <section className="space-y-6">
      {/* Header */}
      <Card className="border border-border bg-card">
        <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground">
              Slug: <span className="font-mono">{course.slug}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "rounded-full border px-2 py-0.5 text-xs",
                course.isPublished
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              )}
            >
              {course.isPublished ? "Published" : "Draft"}
            </span>
            <Link href="/admin/courses">
              <Button variant="outline">Back to Courses</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Metric label="Sessions" value={course._count.sessions} />
          <Metric label="Enrollments" value={course._count.enrollments} />
          <Metric label="Completion Cells" value={`${completedCells}/${totalCells}`} />
          <Metric label="Completion" value={`${completionPct}%`} />
        </CardContent>
      </Card>

      {/* Sessions */}
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
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
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

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
