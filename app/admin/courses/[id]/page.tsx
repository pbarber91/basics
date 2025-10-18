// app/admin/courses/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Params = { id: string };

export default async function AdminCourseDetailPage({ params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  // derive role safely (no `any`)
  type SafeUser = { role?: "USER" | "LEADER" | "ADMIN" };
  const role = ((session.user ?? {}) as SafeUser).role ?? "USER";
  if (role !== "ADMIN" && role !== "LEADER") redirect("/forbidden");

  const course = await prisma.course.findUnique({
    where: { id: params.id },
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
    },
  });

  if (!course) notFound();

  const sessionsCount = course._count.sessions ?? 0;
  const enrollmentsCount = course._count.enrollments ?? 0;
  const totalCells = sessionsCount * enrollmentsCount;

  // ✅ Correct relation path: Progress -> session -> courseId
  const completedCells = totalCells
    ? await prisma.progress.count({
        where: { session: { courseId: course.id } },
      })
    : 0;

  const completionPct = totalCells ? Math.round((completedCells / totalCells) * 100) : 0;

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Course overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Title" value={course.title} />
            <Stat label="Slug" value={course.slug} />
            <Stat label="Status" value={course.isPublished ? "Published" : "Draft"} />
            <Stat label="Sessions" value={sessionsCount.toString()} />
            <Stat label="Enrollments" value={enrollmentsCount.toString()} />
            <Stat label="Progress cells" value={`${completedCells} / ${totalCells}`} />
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">Completion</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${completionPct}%` }}
                aria-label="Completion percentage"
              />
            </div>
            <p className="mt-2 text-sm">{completionPct}%</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
