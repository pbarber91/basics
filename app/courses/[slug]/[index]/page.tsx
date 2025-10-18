// app/courses/[slug]/[index]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  // Find current user id
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!me) redirect("/signin");

  const weekNumber = Math.max(parseInt(index, 10) || 1, 1);

  // Load course & this session (note: no 'content' field selected)
  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      isPublished: true,
      sessions: {
        where: { index: weekNumber },
        select: { id: true, index: true, title: true },
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

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>
            {course.title} — Week {thisSession.index}: {thisSession.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Placeholder until a content field exists on CourseSession */}
          <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
            Session content is not available yet.
          </div>

          <div className="flex items-center gap-3">
            {/* Reintroduce a complete/progress action when your Prisma model supports it */}
            <Button variant="outline" disabled>
              Mark as completed (coming soon)
            </Button>

            <Link href={`/courses/${slug}`}>
              <Button variant="outline">Back to overview</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
