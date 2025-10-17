// app/courses/[slug]/[index]/page.tsx
export const runtime = "nodejs"; // avoid Edge; Prisma/bcrypt need Node APIs

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessCourse } from "@/lib/acl";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import Breadcrumbs from "@/components/Breadcrumbs";
import ProgressChip from "@/components/ProgressChip";
import VideoPlayer from "@/components/VideoPlayer";
import TranscriptToggle from "@/components/TranscriptToggle";
import SessionGuide from "@/components/SessionGuide";
import ResourcesList from "@/components/ResourcesList";
import ReflectionJournal from "@/components/ReflectionJournal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Params = { slug: string; index: string };

export default async function CourseSessionPage({
  params,
}: {
  params: Promise<Params>; // ✅ Next 15 requires Promise
}) {
  const { slug, index } = await params; // ✅ await the params
  const weekNumber = Number(index);
  if (!Number.isFinite(weekNumber) || weekNumber < 1) return notFound();

  // Require auth
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const role = (session.user as any)?.role ?? "USER";

  // Resolve current user
  const me = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!me) redirect("/signin");

  // Find course + this session
  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      summary: true,
      thumbnail: true,
      isPublished: true,
      sessions: {
        where: { index: weekNumber },
        select: {
          id: true,
          index: true,
          title: true,
          summary: true,
          videoUrl: true,
          captionsVttUrl: true,
          transcript: true,
          guideOnlineUrl: true,
          guidePdfUrl: true,
          thumbnail: true,
        },
      },
      _count: { select: { sessions: true } },
    },
  });
  if (!course) return notFound();

  // Enforce enrollment for USERs
  const allowed = await canAccessCourse({ userId: me.id, role, courseId: course.id });
  if (!allowed) redirect("/courses");

  const s = course.sessions[0];
  if (!s) return notFound();

  // Progress metrics for this course (optional: you might scope Progress by course later)
  const [completedCount, thisWeekProgress] = await Promise.all([
    prisma.progress.count({ where: { userId: me.id } }),
    prisma.progress.findUnique({
      where: { userId_weekNumber: { userId: me.id, weekNumber } },
      select: { id: true },
    }),
  ]);
  const thisWeekDone = Boolean(thisWeekProgress);
  const progressCurrent = completedCount > 0 ? completedCount : weekNumber;
  const totalWeeks = course._count.sessions;

  // Mark complete action
  async function markComplete() {
    "use server";
    const cur = await auth();
    const email = cur?.user?.email;
    if (!email) redirect("/signin");

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) redirect("/signin");

    // NOTE: current Progress model is global by weekNumber.
    // If you add course-scoped progress later, change this accordingly.
    await prisma.progress.upsert({
      where: { userId_weekNumber: { userId: user.id, weekNumber } },
      update: {},
      create: { userId: user.id, weekNumber },
    });

    revalidatePath(`/courses/${slug}/${weekNumber}`);
  }

  return (
    <section className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumbs
          trail={[
            { label: "Home", href: "/" },
            { label: "Courses", href: "/courses" },
            { label: course.title, href: `/courses/${slug}` },
            { label: `Week ${s.index}` },
          ]}
        />
        <ProgressChip current={progressCurrent} total={totalWeeks} />
      </div>

      {/* Title card */}
      <Card className="border border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">
              Week {s.index}: {s.title}
            </h1>
            {thisWeekDone && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                Completed
              </span>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">{s.summary}</p>
        </CardContent>
      </Card>

      {/* Video + transcript */}
      <Card className="border border-border bg-card">
        <CardContent className="p-4">
          <VideoPlayer src={s.videoUrl} captionsVttUrl={s.captionsVttUrl ?? undefined} />
          <div className="mt-4">
            <TranscriptToggle text={s.transcript ?? ""} />
          </div>
        </CardContent>
      </Card>

      {/* Guides & resources */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-border bg-card">
          <CardContent className="p-4">
            <SessionGuide onlineUrl={s.guideOnlineUrl} pdfUrl={s.guidePdfUrl} />
          </CardContent>
        </Card>
        <Card className="border border-border bg-card">
          <CardContent className="p-4">
            {/* If you later store per-session resources in DB, render them here.
               For now, leave this placeholder component or remove it. */}
            <ResourcesList items={[]} role={role as "USER" | "LEADER" | "ADMIN"} />
          </CardContent>
        </Card>
      </div>

      {/* Reflection journal (still keyed by weekNumber) */}
      <Card className="border border-border bg-card">
        <CardContent className="p-4">
          <ReflectionJournal weekNumber={weekNumber} prompts={[]} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <form action={markComplete}>
          <Button type="submit" disabled={thisWeekDone}>
            {thisWeekDone ? "Already completed" : "Mark week complete"}
          </Button>
        </form>
        <a className="text-sm underline" href={`/courses/${slug}`}>
          Back to Course
        </a>
      </div>
    </section>
  );
}
