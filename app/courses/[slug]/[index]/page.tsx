// app/courses/[slug]/[index]/page.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import Breadcrumbs from "@/components/Breadcrumbs";
import ProgressChip from "@/components/ProgressChip";
import VideoPlayer from "@/components/VideoPlayer";
import TranscriptToggle from "@/components/TranscriptToggle";
import SessionGuide from "@/components/SessionGuide";
import ResourcesList from "@/components/ResourcesList";
import ReflectionJournal from "@/components/ReflectionJournal";

export default async function SessionPage({ params }: { params: { slug: string; index: string } }) {
  const session = await auth();
  const email = session?.user?.email;
  const role = (session?.user as any)?.role ?? "USER";
  if (!email) redirect("/signin");

  const me = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!me) redirect("/signin");

  const course = await prisma.course.findUnique({
    where: { slug: params.slug },
    include: { sessions: { orderBy: { index: "asc" } } },
  });
  if (!course || !course.isPublished) return notFound();

  const idx = Number(params.index);
  const s = course.sessions.find((x) => x.index === idx);
  if (!s) return notFound();

  const completedCount = await prisma.progress.count({
    where: { userId: me.id, session: { courseId: course.id } },
  });

  const thisCompleted = await prisma.progress.findUnique({
    where: { userId_sessionId: { userId: me.id, sessionId: s.id } },
    select: { id: true },
  });

  async function markComplete() {
    "use server";
    const a = await auth();
    const em = a?.user?.email;
    if (!em) redirect("/signin");
    const user = await prisma.user.findUnique({ where: { email: em }, select: { id: true } });
    if (!user) redirect("/signin");

    await prisma.progress.upsert({
      where: { userId_sessionId: { userId: user.id, sessionId: s.id } },
      update: {},
      create: { userId: user.id, sessionId: s.id },
    });

    revalidatePath(`/courses/${course.slug}/${idx}`);
    revalidatePath(`/courses/${course.slug}`);
  }

  const total = course.sessions.length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumbs trail={[
          { label: "Home", href: "/" },
          { label: "Courses", href: "/courses" },
          { label: course.title, href: `/courses/${course.slug}` },
          { label: `Session ${s.index}` },
        ]}/>
        <ProgressChip current={Math.max(completedCount, s.index)} total={total} />
      </div>

      <header className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Session {s.index}: {s.title}</h1>
          {thisCompleted && (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">Completed</span>
          )}
        </div>
        <p className="mt-1 text-muted-foreground">{s.summary}</p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4">
        <VideoPlayer src={s.videoUrl} captionsVttUrl={s.captionsVttUrl ?? undefined} />
        <div className="mt-4">
          <TranscriptToggle text={s.transcript ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <SessionGuide onlineUrl={s.guideOnlineUrl} pdfUrl={s.guidePdfUrl} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          {/* fetch resources from DB if you move them there; placeholder below */}
          <ResourcesList
            items={[]}
            role={role as "USER" | "LEADER" | "ADMIN"}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <ReflectionJournal weekNumber={s.index} prompts={[]} />
      </div>

      <div className="flex items-center gap-3">
        <form action={markComplete}>
          <button
            type="submit"
            disabled={Boolean(thisCompleted)}
            className="rounded-lg border border-border bg-background px-3 py-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {thisCompleted ? "Already completed" : "Mark session complete"}
          </button>
        </form>
        <a className="text-sm underline" href={`/courses/${course.slug}`}>Back to Course</a>
      </div>
    </section>
  );
}
