// app/courses/[slug]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { canAccessCourse } from "@/lib/acl";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const role = (session.user as any).role ?? "USER";

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!me) redirect("/signin");

  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      summary: true,
      thumbnail: true,
      isPublished: true,
      sessions: { orderBy: { index: "asc" }, select: { id: true, index: true, title: true } },
    },
  });
  if (!course) return notFound();

  // Enforce enrollment (except for staff)
  const allowed = await canAccessCourse({ userId: me.id, role, courseId: course.id });
  if (!allowed) redirect("/courses"); // or render a friendly "not enrolled" page

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardContent className="p-0">
          {course.thumbnail ? (
            <img src={course.thumbnail} alt="" className="h-48 w-full object-cover" />
          ) : (
            <div className="h-48 bg-muted" />
          )}
          <div className="p-6">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="mt-1 text-muted-foreground">{course.summary}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {course.sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
              <div>
                <div className="text-sm uppercase tracking-wide text-muted-foreground">Week {s.index}</div>
                <div className="font-medium">{s.title}</div>
              </div>
              <Link href={`/courses/${slug}/${s.index}`}>
                <Button size="sm">Start</Button>
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
