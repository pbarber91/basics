// app/admin/courses/page.tsx
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

export default async function AdminCoursesPage() {
  const session = await auth();
  const role = (session?.user as any)?.role ?? "USER";
  if (role !== "ADMIN" && role !== "LEADER") redirect("/forbidden");

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      thumbnail: true,
      isPublished: true,
      _count: { select: { sessions: true, enrollments: true } },
    },
  });

  async function createCourse(formData: FormData) {
    "use server";
    const s = await auth();
    if ((s?.user as any)?.role !== "ADMIN") redirect("/forbidden");

    const slug = String(formData.get("slug") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const summary = String(formData.get("summary") || "").trim();
    const thumbnailUrl = String(formData.get("thumbnail") || "").trim();
    const file = formData.get("thumbnailFile") as File | null;
    const isPublished = formData.get("isPublished") === "on";

    if (!slug || !title) return;

    let thumbnail: string | null = null;
    if (file && file.size > 0) {
      const { publicPath } = await saveImageToPublicDir(file, `courses/${slug}`);
      thumbnail = publicPath;
    } else if (thumbnailUrl) {
      thumbnail = thumbnailUrl;
    }

    await prisma.course.create({
      data: { slug, title, summary, thumbnail, isPublished },
    });

    revalidatePath("/admin/courses");
  }

  async function deleteCourse(formData: FormData) {
    "use server";
    const s = await auth();
    if ((s?.user as any)?.role !== "ADMIN") redirect("/forbidden");

    const id = String(formData.get("id") || "");
    if (!id) return;
    await prisma.course.delete({ where: { id } });
    revalidatePath("/admin/courses");
  }

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardContent className="flex items-end justify-between gap-4 p-6">
          <div>
            <h1 className="text-2xl font-bold">Admin · Courses</h1>
            <p className="text-muted-foreground">
              Create and manage courses. Click into a course to edit sessions and enrollments.
            </p>
          </div>
          <Link href="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Create a New Course</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCourse} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm text-muted-foreground">Slug (unique)</label>
              <Input name="slug" placeholder="basics" required />
            </div>
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm text-muted-foreground">Title</label>
              <Input name="title" placeholder="Basics" required />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-muted-foreground">Summary</label>
              <textarea
                name="summary"
                className="min-h-[80px] w-full rounded-md border border-border bg-background p-2 text-sm"
                placeholder="Short description of the course"
              />
            </div>
            <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Thumbnail URL (optional)</label>
                <Input name="thumbnail" placeholder="/images/courses/basics.jpg" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Upload Thumbnail (optional)</label>
                <Input name="thumbnailFile" type="file" accept="image/*" />
              </div>
              <div className="flex items-center gap-3 pt-1 sm:col-span-2">
                <input
                  id="isPublished"
                  name="isPublished"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-border bg-background"
                />
                <label htmlFor="isPublished" className="text-sm">Published</label>
              </div>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">Create Course</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle>Existing Courses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-muted-foreground">
                <tr>
                  <Th>Title</Th>
                  <Th>Slug</Th>
                  <Th>Thumb</Th>
                  <Th>Published</Th>
                  <Th>Sessions</Th>
                  <Th>Enrollments</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <Td className="font-medium">{c.title}</Td>
                    <Td><code className="text-xs">{c.slug}</code></Td>
                    <Td>
                      {c.thumbnail ? (
                        <img
                          src={c.thumbnail}
                          alt=""
                          className="h-8 w-12 rounded object-cover ring-1 ring-border"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td>{c.isPublished ? "Yes" : "No"}</Td>
                    <Td>{c._count.sessions}</Td>
                    <Td>{c._count.enrollments}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/courses/${c.id}`}>
                          <Button size="sm" variant="outline">Edit</Button>
                        </Link>
                        <form action={deleteCourse}>
                          <input type="hidden" name="id" value={c.id} />
                          <Button
                            size="sm"
                            variant="destructive"
                            type="submit"
                            disabled={c._count.enrollments > 0}
                            title={c._count.enrollments > 0 ? "Unenroll users first" : ""}
                          >
                            Delete
                          </Button>
                        </form>
                      </div>
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

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={clsx("px-3 py-2", className)}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx("px-3 py-2 align-middle", className)}>{children}</td>;
}
