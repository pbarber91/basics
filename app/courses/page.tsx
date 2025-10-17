// app/courses/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function CoursesIndexPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const role = (session.user as any).role ?? "USER";

  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!me) redirect("/signin");

  let courses;

  if (role === "ADMIN" || role === "LEADER") {
    // Staff can see ALL courses (published + drafts if you want)
    courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, title: true, summary: true, thumbnail: true, isPublished: true },
    });
  } else {
    // Users see only courses they are ENROLLED in (and usually only published ones)
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: me.id, status: "ACTIVE" },
      select: { courseId: true },
    });
    const ids = enrollments.map((e) => e.courseId);
    courses = await prisma.course.findMany({
      where: { id: { in: ids }, isPublished: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, title: true, summary: true, thumbnail: true, isPublished: true },
    });
  }

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Courses</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <article key={c.id} className="overflow-hidden rounded-xl border border-border bg-background">
              {c.thumbnail ? (
                <img src={c.thumbnail} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 w-full bg-muted" />
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold">{c.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.summary}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Link href={`/courses/${c.slug}`}>
                    <Button size="sm">View course</Button>
                  </Link>
                  {(role === "ADMIN" || role === "LEADER") && !c.isPublished ? (
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">Draft</span>
                  ) : null}
                </div>
              </div>
            </article>
          ))}

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
