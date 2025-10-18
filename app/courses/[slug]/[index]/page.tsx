// app/courses/[slug]/[index]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";

type Role = "USER" | "LEADER" | "ADMIN";

export default async function CourseSessionPage({
  params,
}: {
  params: Promise<{ slug: string; index: string }>;
}) {
  const { slug, index } = await params;

  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const role = (session.user as Record<string, unknown>)["role"] as Role | undefined;

  // current user id
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!me) redirect("/signin");

  const weekNumber = Math.max(parseInt(index, 10) || 1, 1);

  // Load course & this session (no 'content' selected)
  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      isPublished: true,
      sessions: {
        where: { index: weekNumber },
        select: { id: true, index: true, title: true }, // <-- no 'content' here
      },
    },
  });
  if (!course) return notFound();

  const thisSession = course.sessions[0];
  if (!thisSession) return notFound();

  // Require enrollment for non-staff
  if (role !== "ADMIN" && role !== "LEADER") {
    const enrolled = await prisma.enrollment.findFirst({
      where: { userId: me.id, courseId: course.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (!enrolled) redirect("/courses");
  }

  // Progress stats + whether this week is already completed
  const [totalProgress, existing] = await Promise.all([
    prisma.progress.count({ where: { userId: me.id } }),
    prisma.progress.findFirst({
      where: { userId: me.id, weekNumber },
      select: { id: true },
    }),
  ]);

  /* ---------------- Server Action ---------------- */

  async function markComplete() {
    "use server";
    const s = await auth();
    if (!s?.user?.email) redirect("/signin");
    const meNow = await prisma.user.findUnique({
      where: { email: s.user.email },
      select: { id: true },
    });
    if (!meNow) redirect("/signin");

    const already = await prisma.progress.findFirst({
      where: { userId: meNow.id, weekNumber },
      select: { id: true },
    });

    if (!already) {
      await prisma.progress.create({
        data: { userId: meNow.id, weekNumber },
      });
    }

    revalidatePath(`/courses/${slug}/${weekNumber}`);
  }

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>
            {course.title} — Week {thisSession.index}: {thisSession.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* You can replace this placeholder with real content fields later */}
          <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
            Session content is not available yet.
          </div>

          <div className="flex items-center gap-3">
            <form action={markComplete}>
              <Button type="submit" disabled={!!existing}>
                {existing ? "Completed" : "Mark as completed"}
              </Button>
            </form>

            <span className="text-sm text-muted-foreground">
              Progress: {totalProgress} / 8
            </span>

            <Link href={`/courses/${slug}`}>
              <Button variant="outline">Back to overview</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
