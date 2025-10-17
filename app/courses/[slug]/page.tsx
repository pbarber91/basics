// app/courses/[slug]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { canAccessCourse } from "@/lib/acl";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PageParams = Promise<{ slug: string }>;

type SessionSummary = {
  id: string;
  index: number;
  title: string;
};

type CourseOverview = {
  id: string;
  title: string;
  summary: string | null;
  thumbnail: string | null;
  isPublished: boolean;
  sessions: SessionSummary[];
};

export default async function CourseOverviewPage({
  params,
}: {
  params: PageParams;
}) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  const role =
    (session.user as Record<string, unknown>)["role"] === "ADMIN" ||
    (session.user as Record<string, unknown>)["role"] === "LEADER"
      ? ((session.user as Record<string, unknown>)["role"] as "ADMIN" | "LEADER")
      : "USER";

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
      sessions: {
        orderBy: { index: "asc" },
        select: { id: true, index: true, title: true },
      },
    },
  });

  if (!course) return notFound();

  // Enforce enrollment (except staff)
  const allowed = await canAccessCourse({
    userId: me.id,
    role,
    courseId: course.id,
  });
  if (!allowed) redirect("/courses");

  const typedCourse = course as CourseOverview;

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardContent className="p-0">
          {typedCourse.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typedCourse.thumbnail}
              alt=""
              className="h-48 w-full object-cover"
            />
          ) : (
            <div className="h-48 bg-muted" />
          )}
          <div className="p-6">
            <h1 className="text-2xl font-bold">{typedCourse.title}</h1>
            <p className="mt-1 text-muted-foreground">
              {typedCourse.summary}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {typedCourse.sessions.map((s: SessionSummary) => (
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
              <Link href={`/courses/${slug}/${s.index}`}>
                <Button size="sm">Start</Button>
              </Link>
            </div>
          ))}

          {typedCourse.sessions.length === 0 && (
            <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              No sessions yet.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
