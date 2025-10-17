// app/admin/courses/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import Link from "next/link";
import clsx from "clsx";

import { saveImageToPublicDir } from "@/lib/saveUpload";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  const role = (session?.user as any)?.role ?? "USER";
  if (role !== "ADMIN" && role !== "LEADER") redirect("/forbidden");

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      sessions: { orderBy: { index: "asc" } },
      _count: { select: { sessions: true, enrollments: true } },
      enrollments: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });
  if (!course) redirect("/admin/courses");

  const totalCells = course._count.sessions * course._count.enrollments || 0;
  const completedCells = totalCells
    ? await prisma.progress.count({ where: { session: { courseId: course.id } } })
    : 0;
  const completionPct = totalCells ? Math.round((completedCells / totalCells) * 100) : 0;

  /* ----------------- Server actions ----------------- */
  async function updateCourse(formData: FormData) {
    "use server";
    const s = await auth();
    if ((s?.user as any)?.role !== "ADMIN") redirect("/forbidden");

    const courseId = String(formData.get("id") || "");
    const slug = String(formData.get("slug") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const summary = String(formData.get("summary") || "").trim();
    const thumbnailUrl = String(formData.get("thumbnail") || "").trim();
    const file = formData.get("thumbnailFile") as File | null;
    const isPublished = formData.get("isPublished") === "on";

    if (!courseId || !title || !slug) return;

    let thumbnail: string | null | undefined = undefined;
    if (file && file.size > 0) {
      const { publicPath } = await saveImageToPublicDir(file, `courses/${slug}`);
      thumbnail = publicPath;
    } else if (thumbnailUrl) {
      thumbnail = thumbnailUrl;
    }

    await prisma.course.update({
      where: { id: courseId },
      data: {
        slug,
        title,
        summary,
        ...(thumbnail !== undefined ? { thumbnail } : {}),
        isPublished,
      },
    });

    revalidatePath(`/admin/courses/${courseId}`);
    revalidatePath(`/courses/${slug}`);
  }

  async function createSession(formData: FormData) {
    "use server";
    const s = await auth();
    if ((s?.user as any)?.role !== "ADMIN") redirect("/forbidden");

    const courseId = String(formData.get("courseId") || "");
    const courseSlug = String(formData.get("courseSlug") || "").trim();
    const index = Number(formData.get("index") || "0");
    const title = String(formData.get("title") || "").trim();
    const summary = String(formData.get("summary") || "").trim();
    const videoUrl = String(formData.get("videoUrl") || "").trim();
    const captionsVttUrl = String(formData.get("captionsVttUrl") || "").trim();
    const transcript = String(formData.get("transcript") || "").trim();
    const guideOnlineUrl = String(formData.get("guideOnlineUrl") || "").trim();
    const guidePdfUrl = String(formData.get("guidePdfUrl") || "").trim();
    const thumbnailUrl = String(formData.get("thumbnail") || "").trim();
    const file = formData.get("thumbnailFile") as File | null;

    if (!courseId || !index || !title || !videoUrl || !guideOnlineUrl || !guidePdfUrl) return;

    let thumbnail: string | null = null;
    if (file && file.size > 0 && courseSlug) {
      const { publicPath } = await saveImageToPublicDir(
        file,
        `courses/${courseSlug}/sessions`
      );
      thumbnail = publicPath;
    } else if (thumbnailUrl) {
      thumbnail = thumbnailUrl;
    }

    await prisma.courseSession.create({
      data: {
        courseId,
        index,
        title,
        summary,
        videoUrl,
        captionsVttUrl: captionsVttUrl || null,
        transcript: transcript || null,
        guideOnlineUrl,
        guidePdfUrl,
        thumbnail,
      },
    });

    revalidatePath(`/admin/courses/${courseId}`);
  }

  async function updateSession(formData: FormData) {
    "use server";
    const s = await auth();
    if ((s?.user as any)?.role !== "ADMIN") redirect("/forbidden");

    const sessionId = String(formData.get("id") || "");
    const courseSlug = String(formData.get("courseSlug") || "").trim();
    const index = Number(formData.get("index") || "0");
    const title = String(formData.get("title") || "").trim();
    const summary = String(formData.get("summary") || "").trim();
    const videoUrl = String(formData.get("videoUrl") || "").trim();
    const captionsVttUrl = String(formData.get("captionsVttUrl") || "").trim();
    const transcript = String(formData.get("transcript") || "").trim();
    const guideOnlineUrl = String(formData.get("guideOnlineUrl") || "").trim();
    const guidePdfUrl = String(formData.get("guidePdfUrl") || "").trim();
    const thumbnailUrl = String(formData.get("thumbnail") || "").trim();
    const file = formData.get("thumbnailFile") as File | null;

    if (!sessionId || !index || !title || !videoUrl || !guideOnlineUrl || !guidePdfUrl) return;

    // Only update thumbnail if user supplied a new value; otherwise leave it unchanged.
    let thumbnail: string | null | undefined = undefined;
    if (file && file.size > 0 && courseSlug) {
      const { publicPath } = await saveImageToPublicDir(
        file,
        `courses/${courseSlug}/sessions`
      );
      thumbnail = publicPath;
    } else if (thumbnailUrl) {
      thumbnail = thumbnailUrl;
    }

    await prisma.courseSession.update({
      where: { id: sessionId },
      data: {
        index,
        title,
        summary,
        videoUrl,
        captionsVttUrl: captionsVttUrl || null,
        transcript: transcript || null,
        guideOnlineUrl,
        guidePdfUrl,
        ...(thumbnail !== undefined ? { thumbnail } : {}),
      },
    });

    revalidatePath(`/admin/courses/${id}`);
  }

  async function deleteSession(formData: FormData) {
    "use server";
    const s = await auth();
    if ((s?.user as any)?.role !== "ADMIN") redirect("/forbidden");

    const sessionId = String(formData.get("id") || "");
    if (!sessionId) return;
    await prisma.courseSession.delete({ where: { id: sessionId } });
    revalidatePath(`/admin/courses/${id}`);
  }

  async function enrollUser(formData: FormData) {
    "use server";
    const s = await auth();
    if ((s?.user as any)?.role !== "ADMIN") redirect("/forbidden");

    const courseId = String(formData.get("courseId") || "");
    const email = String(formData.get("email") || "").trim();
    if (!courseId || !email) return;

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return;

    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: user.id, courseId } },
      update: { status: "ACTIVE" },
      create: { userId: user.id, courseId, status: "ACTIVE" },
    });

    revalidatePath(`/admin/courses/${courseId}`);
  }

  async function unenrollUser(formData: FormData) {
    "use server";
    const s = await auth();
    if ((s?.user as any)?.role !== "ADMIN") redirect("/forbidden");

    const enrollmentId = String(formData.get("id") || "");
    if (!enrollmentId) return;
    await prisma.enrollment.delete({ where: { id: enrollmentId } });
    revalidatePath(`/admin/courses/${id}`);
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Edit Course</h1>
        <Link href="/admin/courses">
          <Button variant="outline">Back to Courses</Button>
        </Link>
      </div>

      {/* Course edit */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Course</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateCourse} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={course.id} />
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Slug</label>
              <Input name="slug" defaultValue={course.slug} required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Title</label>
              <Input name="title" defaultValue={course.title} required />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-muted-foreground">Summary</label>
              <textarea
                name="summary"
                defaultValue={course.summary ?? ""}
                className="min-h-[80px] w-full rounded-md border border-border bg-background p-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Thumbnail URL</label>
                <Input name="thumbnail" defaultValue={course.thumbnail ?? ""} />
                {course.thumbnail ? (
                  <p className="mt-1 text-xs text-muted-foreground">Current: {course.thumbnail}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Upload New Thumbnail</label>
                <Input name="thumbnailFile" type="file" accept="image/*" />
                <p className="mt-1 text-xs text-muted-foreground">If provided, it will replace the thumbnail.</p>
              </div>

              <div className="flex items-center gap-3 pt-1 sm:col-span-2">
                <input
                  id="isPublished"
                  name="isPublished"
                  type="checkbox"
                  defaultChecked={course.isPublished}
                  className="h-4 w-4 rounded border-border bg-background"
                />
                <label htmlFor="isPublished" className="text-sm">Published</label>
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="mr-4">Sessions: <b>{course._count.sessions}</b></span>
                <span className="mr-4">Enrollments: <b>{course._count.enrollments}</b></span>
                <span>Completion: <b>{completionPct}%</b></span>
              </div>
              <Button type="submit">Save Course</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create session (with file upload) */}
          <form action={createSession} className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-2">
            <input type="hidden" name="courseId" value={course.id} />
            <input type="hidden" name="courseSlug" value={course.slug} />
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Index (1..N)</label>
              <Input name="index" type="number" min={1} required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Title</label>
              <Input name="title" placeholder="Session title" required />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-muted-foreground">Summary</label>
              <textarea name="summary" className="min-h-[70px] w-full rounded-md border border-border bg-background p-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Video URL</label>
              <Input name="videoUrl" placeholder="/videos/week1.mp4" required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Captions (.vtt) URL</label>
              <Input name="captionsVttUrl" placeholder="/captions/week1.vtt" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-muted-foreground">Transcript (plain text)</label>
              <textarea name="transcript" className="min-h-[70px] w-full rounded-md border border-border bg-background p-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Guide (Online) URL</label>
              <Input name="guideOnlineUrl" placeholder="/guides/week1.html" required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Guide (PDF) URL</label>
              <Input name="guidePdfUrl" placeholder="/guides/week1-fillable.pdf" required />
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Thumbnail URL (optional)</label>
              <Input name="thumbnail" placeholder="/images/weeks/week-1.webp" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Upload Thumbnail (optional)</label>
              <Input name="thumbnailFile" type="file" accept="image/*" />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">Add Session</Button>
            </div>
          </form>

          <Separator className="bg-border" />

          {/* Existing sessions (each row has update form + Delete button via formAction) */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-muted-foreground">
                <tr>
                  <Th>Index</Th>
                  <Th>Title</Th>
                  <Th>Video</Th>
                  <Th>Guides</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {course.sessions.map((s: typeof course.sessions[number]) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <Td colSpan={5} className="p-0">
                      <form action={updateSession} className="grid gap-3 p-3 sm:grid-cols-6">
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="courseSlug" value={course.slug} />

                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Index</label>
                          <Input name="index" type="number" min={1} defaultValue={s.index} required />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs text-muted-foreground">Title</label>
                          <Input name="title" defaultValue={s.title} required />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="mb-1 block text-xs text-muted-foreground">Summary</label>
                          <Input name="summary" defaultValue={s.summary ?? ""} />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs text-muted-foreground">Video URL</label>
                          <Input name="videoUrl" defaultValue={s.videoUrl} required />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Captions URL</label>
                          <Input name="captionsVttUrl" defaultValue={s.captionsVttUrl ?? ""} />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="mb-1 block text-xs text-muted-foreground">Transcript</label>
                          <Input name="transcript" defaultValue={s.transcript ?? ""} />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs text-muted-foreground">Guide Online</label>
                          <Input name="guideOnlineUrl" defaultValue={s.guideOnlineUrl} required />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs text-muted-foreground">Guide PDF</label>
                          <Input name="guidePdfUrl" defaultValue={s.guidePdfUrl} required />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Thumbnail URL</label>
                          <Input name="thumbnail" defaultValue={s.thumbnail ?? ""} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Upload New Thumbnail</label>
                          <Input name="thumbnailFile" type="file" accept="image/*" />
                        </div>

                        <div className="sm:col-span-6 flex justify-end gap-2">
                          <Button type="submit" size="sm" variant="outline">Save</Button>
                          <Button type="submit" size="sm" variant="destructive" formAction={deleteSession}>
                            Delete
                          </Button>
                        </div>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Enrollments */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Enrollments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={enrollUser} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="courseId" value={course.id} />
            <div className="flex-1">
              <label className="mb-1 block text-sm text-muted-foreground">User Email</label>
              <Input name="email" type="email" placeholder="user@example.com" required />
            </div>
            <Button type="submit">Assign to Course</Button>
          </form>

          <Separator className="bg-border" />

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-muted-foreground">
                <tr>
                  <Th>User</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {course.enrollments.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <Td>{e.user.name ?? "—"}</Td>
                    <Td className="font-medium">{e.user.email}</Td>
                    <Td>{e.status}</Td>
                    <Td className="text-right">
                      <form action={unenrollUser} className="inline-block">
                        <input type="hidden" name="id" value={e.id} />
                        <Button type="submit" size="sm" variant="destructive">Remove</Button>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

/* --- tiny table helpers --- */
function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={clsx("px-3 py-2", className)}>{children}</th>;
}
function Td({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td className={clsx("px-3 py-2 align-middle", className)} colSpan={colSpan}>
      {children}
    </td>
  );
}
