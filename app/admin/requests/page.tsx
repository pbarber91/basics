// app/admin/requests/page.tsx
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

export const dynamic = "force-dynamic";

export default async function AccessRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; courseId?: string }>;
}) {
  const { q = "", status = "PENDING", courseId = "" } = await searchParams;

  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const role = (session.user as any).role ?? "USER";
  if (role !== "ADMIN" && role !== "LEADER") redirect("/forbidden");

  // Course filter dropdown
  const courses = await prisma.course.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true },
  });

  // Build WHERE for requests
  const where: any = {};
  if (courseId) where.courseId = courseId;
  if (status && status !== "ALL") where.status = status;
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { name: { contains: q } },
      { message: { contains: q } },
    ];
  }

  const requests = await prisma.accessRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      message: true,
      status: true,
      createdAt: true,
      course: { select: { id: true, title: true, slug: true } },
    },
    take: 200, // safety cap
  });

  /* --------------- Server Actions --------------- */

  async function approve(formData: FormData) {
    "use server";
    const s = await auth();
    const r = (s?.user as any)?.role ?? "USER";
    if (r !== "ADMIN" && r !== "LEADER") redirect("/forbidden");

    const id = String(formData.get("id") || "");
    if (!id) return;

    await prisma.accessRequest.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    revalidatePath("/admin/requests");
  }

  async function approveAndEnroll(formData: FormData) {
    "use server";
    const s = await auth();
    const r = (s?.user as any)?.role ?? "USER";
    if (r !== "ADMIN" && r !== "LEADER") redirect("/forbidden");

    const id = String(formData.get("id") || "");
    const email = String(formData.get("email") || "").toLowerCase();
    const courseIdVal = String(formData.get("courseId") || "");
    if (!id || !email || !courseIdVal) return;

    // Mark approved
    await prisma.accessRequest.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    // If a user exists with that email, enroll them (ACTIVE)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: user.id, courseId: courseIdVal } },
        update: { status: "ACTIVE" },
        create: { userId: user.id, courseId: courseIdVal, status: "ACTIVE" },
      });
    }

    revalidatePath("/admin/requests");
  }

  async function reject(formData: FormData) {
    "use server";
    const s = await auth();
    const r = (s?.user as any)?.role ?? "USER";
    if (r !== "ADMIN" && r !== "LEADER") redirect("/forbidden");

    const id = String(formData.get("id") || "");
    if (!id) return;

    await prisma.accessRequest.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    revalidatePath("/admin/requests");
  }

  async function remove(formData: FormData) {
    "use server";
    const s = await auth();
    const r = (s?.user as any)?.role ?? "USER";
    if (r !== "ADMIN" && r !== "LEADER") redirect("/forbidden");

    const id = String(formData.get("id") || "");
    if (!id) return;

    await prisma.accessRequest.delete({ where: { id } });
    revalidatePath("/admin/requests");
  }

  /* ---------------------- UI ---------------------- */

  return (
    <section className="space-y-6">
      {/* Header / nav */}
      <Card className="border border-border bg-card">
        <CardContent className="flex items-end justify-between gap-4 p-6">
          <div>
            <h1 className="text-2xl font-bold">Access Requests</h1>
            <p className="text-sm text-muted-foreground">
              Review course access requests, approve, approve + auto-enroll (if user exists), reject, or delete.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin">
              <Button variant="outline">Admin Home</Button>
            </Link>
            <Link href="/admin/enroll">
              <Button variant="outline">Enroll Users</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Course</label>
              <select
                name="courseId"
                defaultValue={courseId}
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              >
                <option value="">All courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Status</label>
              <select
                name="status"
                defaultValue={status}
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-muted-foreground">Search</label>
              <Input name="q" placeholder="name, email, message…" defaultValue={q} />
            </div>

            <div className="sm:col-span-4 flex justify-end">
              <Button type="submit">Apply Filters</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Requests table */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>
            Results{" "}
            <span className="ml-2 rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
              {requests.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-muted-foreground">
                <tr>
                  <Th>When</Th>
                  <Th>Course</Th>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Message</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <Td>{formatDateTime(r.createdAt)}</Td>
                    <Td>{r.course.title}</Td>
                    <Td>{r.name}</Td>
                    <Td className="font-medium">{r.email}</Td>
                    <Td className="max-w-[28ch] truncate" title={r.message ?? ""}>
                      {r.message ?? "—"}
                    </Td>
                    <Td>
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-xs",
                          r.status === "PENDING" && "border border-amber-500/30 bg-amber-500/10 text-amber-300",
                          r.status === "APPROVED" && "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                          r.status === "REJECTED" && "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                        )}
                      >
                        {r.status}
                      </span>
                    </Td>
                    <Td className="text-right">
                      {/* Single form with multiple actions via formAction */}
                      <form className="inline-flex gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="email" value={r.email} />
                        <input type="hidden" name="courseId" value={r.course.id} />

                        <Button type="submit" size="sm" variant="outline" formAction={approve}>
                          Approve
                        </Button>
                        <Button type="submit" size="sm" formAction={approveAndEnroll}>
                          Approve + Enroll
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                          className="border-border"
                          formAction={reject}
                        >
                          Reject
                        </Button>
                        <Button type="submit" size="sm" variant="destructive" formAction={remove}>
                          Delete
                        </Button>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {requests.length === 0 && (
            <div className="mt-4 rounded-xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
              No requests match your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/* --------- tiny helpers --------- */
function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={clsx("px-3 py-2", className)}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx("px-3 py-2 align-middle", className)}>{children}</td>;
}
function formatDateTime(d: Date) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(d));
  } catch {
    return String(d);
  }
}
