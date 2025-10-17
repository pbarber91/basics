// app/admin/enroll/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import clsx from "clsx";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default async function EnrollPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; courseId?: string }>;
}) {
  const { q = "", courseId: selectedCourseId = "" } = await searchParams;

  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const role = (session.user as any).role ?? "USER";
  if (role !== "ADMIN" && role !== "LEADER") redirect("/forbidden");

  // Courses to choose from
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, title: true, isPublished: true },
  });

  const course = selectedCourseId
    ? await prisma.course.findUnique({
        where: { id: selectedCourseId },
        select: {
          id: true,
          title: true,
          slug: true,
          _count: { select: { enrollments: true } },
          enrollments: { select: { id: true, userId: true, status: true } },
        },
      })
    : null;

  // ----- FIXED: remove `mode: "insensitive"` (unsupported on SQLite)
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q } },
            { name: { contains: q } },
          ],
        }
      : undefined,
    orderBy: [{ createdAt: "desc" }],
    take: 50,
    select: { id: true, email: true, name: true, role: true },
  });

  // map enrolled users for the selected course
  const enrolledSet = new Set<string>();
  if (course) {
    for (const e of course.enrollments) enrolledSet.add(e.userId);
  }

  /* ---------------- Server actions ---------------- */

  async function enrollOne(formData: FormData) {
    "use server";
    const s = await auth();
    const r = (s?.user as any)?.role ?? "USER";
    if (r !== "ADMIN" && r !== "LEADER") redirect("/forbidden");

    const courseId = String(formData.get("courseId") || "");
    const userId = String(formData.get("userId") || "");
    if (!courseId || !userId) return;

    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { status: "ACTIVE" },
      create: { userId, courseId, status: "ACTIVE" },
    });

    revalidatePath(`/admin/enroll?courseId=${courseId}&q=${encodeURIComponent(q)}`);
  }

  async function unenrollOne(formData: FormData) {
    "use server";
    const s = await auth();
    const r = (s?.user as any)?.role ?? "USER";
    if (r !== "ADMIN" && r !== "LEADER") redirect("/forbidden");

    const courseId = String(formData.get("courseId") || "");
    const userId = String(formData.get("userId") || "");
    if (!courseId || !userId) return;

    await prisma.enrollment.delete({
      where: { userId_courseId: { userId, courseId } },
    });

    revalidatePath(`/admin/enroll?courseId=${courseId}&q=${encodeURIComponent(q)}`);
  }

  async function bulkEnroll(formData: FormData) {
    "use server";
    const s = await auth();
    const r = (s?.user as any)?.role ?? "USER";
    if (r !== "ADMIN" && r !== "LEADER") redirect("/forbidden");

    const courseId = String(formData.get("courseId") || "");
    const emailsRaw = String(formData.get("emails") || "");
    if (!courseId || !emailsRaw) return;

    const emails = emailsRaw
      .split(/[\n,]+/g)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) return;

    const found = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true },
    });

   await Promise.all(
  found.map((u: typeof found[number]) =>
    prisma.enrollment.upsert({
      where: { userId_courseId: { userId: u.id, courseId } },
      update: { status: "ACTIVE" },
      create: { userId: u.id, courseId, status: "ACTIVE" },
    })
  )
);

    revalidatePath(`/admin/enroll?courseId=${courseId}&q=${encodeURIComponent(q)}`);
  }

  /* ---------------- UI ---------------- */

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardContent className="flex items-end justify-between gap-4 p-6">
          <div>
            <h1 className="text-2xl font-bold">Enroll Users</h1>
            <p className="text-muted-foreground">
              Choose a course, search users, then enroll or unenroll. Admins & Leaders can access this page.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin">
              <Button variant="outline">Admin Home</Button>
            </Link>
            <Link href="/admin/courses">
              <Button variant="outline">Manage Courses</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Choose Course & Bulk Enroll</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm text-muted-foreground">Course</label>
              <select
                name="courseId"
                defaultValue={selectedCourseId}
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              >
                <option value="">— Select a course —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.isPublished ? "" : "(Draft)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm text-muted-foreground">Search Users</label>
              <Input name="q" placeholder="name or email" defaultValue={q} />
            </div>

            <div className="sm:col-span-1 flex items-end">
              <Button type="submit" className="w-full">Apply</Button>
            </div>
          </form>

          <Separator className="bg-border" />

          <form action={bulkEnroll} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="courseId" value={selectedCourseId} />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-muted-foreground">
                Bulk Enroll (emails separated by comma or newline)
              </label>
              <textarea
                name="emails"
                placeholder={"user1@example.com\nuser2@example.com"}
                className="min-h-[90px] w-full rounded-md border border-border bg-background p-2 text-sm"
                disabled={!selectedCourseId}
              />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <Button type="submit" className="w-full" disabled={!selectedCourseId}>
                Enroll Emails
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-muted-foreground">
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th className="text-right">Enrollment</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isEnrolled = selectedCourseId ? enrolledSet.has(u.id) : false;
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <Td>{u.name ?? "—"}</Td>
                      <Td className="font-medium">{u.email}</Td>
                      <Td>{u.role}</Td>
                      <Td className="text-right">
                        <form className="inline-flex gap-2">
                          <input type="hidden" name="courseId" value={selectedCourseId} />
                          <input type="hidden" name="userId" value={u.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant={isEnrolled ? "outline" : "default"}
                            disabled={!selectedCourseId || isEnrolled}
                            formAction={enrollOne}
                          >
                            Enroll
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            variant="destructive"
                            disabled={!selectedCourseId || !isEnrolled}
                            formAction={unenrollOne}
                          >
                            Unenroll
                          </Button>
                        </form>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="mt-4 rounded-xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
              No users found for this search.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/* --- tiny table helpers --- */
function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={clsx("px-3 py-2", className)}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx("px-3 py-2 align-middle", className)}>{children}</td>;
}
