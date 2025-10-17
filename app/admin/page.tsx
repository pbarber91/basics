// app/admin/page.tsx
export const runtime = "nodejs";

import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import clsx from "clsx";
import bcrypt from "bcryptjs";

// shadcn/ui
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

// Type for each row returned by the users query below
type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
  _count: { progresses: number };
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // --- Gate: ADMIN only ---
  const session = await auth();
  const myRole = (session?.user as any)?.role ?? "USER";
  const myEmail = session?.user?.email ?? null;
  if (myRole !== "ADMIN") redirect("/signin");

  // --- Read search params safely (Next 15) ---
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const pageStr = typeof sp.page === "string" ? sp.page : "1";
  const page = Math.max(parseInt(pageStr, 10) || 1, 1);
  const pageSize = 10;

  // SQLite doesn't support `mode: "insensitive"`
  const where =
    q.length > 0
      ? {
          OR: [
            { email: { contains: q } },
            { name: { contains: q } },
            { role: { contains: q } },
          ],
        }
      : {};

  const [total, users, adminCount, me] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { progresses: true } },
      },
    }) as Promise<UserRow[]>,
    prisma.user.count({ where: { role: "ADMIN" } }),
    myEmail
      ? prisma.user.findUnique({
          where: { email: myEmail },
          select: { id: true, email: true, role: true },
        })
      : Promise.resolve(null),
  ]);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  /* ---------------- Server actions ---------------- */

  async function createUserAction(formData: FormData) {
    "use server";
    const s = await auth();
    if ((s?.user as any)?.role !== "ADMIN") redirect("/signin");

    const name = String(formData.get("name") || "").trim() || null;
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const role = String(formData.get("role") || "USER").toUpperCase();

    if (!email || !password) return;
    if (password.length < 8) return;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return;

    const hash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hash,
        role: role === "ADMIN" || role === "LEADER" ? role : "USER",
      },
    });

    revalidatePath("/admin");
  }

  async function updateRoleAction(formData: FormData) {
    "use server";
    const s = await auth();
    if ((s?.user as any)?.role !== "ADMIN") redirect("/signin");

    const userId = String(formData.get("userId") || "");
    const nextRole = String(formData.get("nextRole") || "USER");

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return;

    const currentAdminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    const isTargetMe = target.email === s?.user?.email;

    // Keep at least one ADMIN & prevent accidental self-demotion
    if (
      (target.role === "ADMIN" && currentAdminCount <= 1 && nextRole !== "ADMIN") ||
      (isTargetMe && nextRole !== "ADMIN")
    ) {
      return;
    }

    await prisma.user.update({ where: { id: userId }, data: { role: nextRole } });
    revalidatePath("/admin");
  }

  async function deleteUserAction(formData: FormData) {
    "use server";
    const s = await auth();
    if ((s?.user as any)?.role !== "ADMIN") redirect("/signin");

    const userId = String(formData.get("userId") || "");
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return;

    const currentAdminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    const isTargetMe = target.email === s?.user?.email;

    // Block deleting the last ADMIN or deleting yourself
    if ((target.role === "ADMIN" && currentAdminCount <= 1) || isTargetMe) {
      return;
    }

    await prisma.progress.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/admin");
  }

  async function resetProgressAction(formData: FormData) {
    "use server";
    const s = await auth();
    if ((s?.user as any)?.role !== "ADMIN") redirect("/signin");

    const userId = String(formData.get("userId") || "");
    await prisma.progress.deleteMany({ where: { userId } });
    revalidatePath("/admin");
  }

  /* ---------------- UI ---------------- */

  return (
    <section className="space-y-6">
      {/* Header */}
      <Card className="border border-border bg-card">
        <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Console</h1>
            <p className="text-muted-foreground">
              Manage users, roles, and track progress across courses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">You: ADMIN</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Admin Resources */}
      <Card className="shadow-sm border border-border bg-card">
        <CardHeader>
          <CardTitle>Admin Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 text-sm sm:grid-cols-2 md:grid-cols-4">
            <Link href="/admin/courses">
              <Button variant="outline">Manage Courses</Button>
            </Link>
            <Link href="/admin/enroll">
              <Button variant="outline">Enroll Users</Button>
            </Link>
            <Link href="/admin/requests">
              <Button variant="outline">Access Requests</Button>
            </Link>
            <a
              className="rounded-lg border border-border bg-background px-3 py-2 hover:bg-muted"
              href="/admin/week1-feedback.docx"
              target="_blank"
              rel="noreferrer"
            >
              Week 1 — Feedback Form Template
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Users Management */}
      <Card className="shadow-sm border border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Users</CardTitle>
            <form className="flex w-full max-w-md items-center gap-2" action="/admin" method="GET">
              <Input name="q" defaultValue={q} placeholder="Search by name, email, or role…" />
              <Button type="submit" variant="outline">Search</Button>
            </form>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Add User */}
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="mb-3 font-semibold">Add User</h3>
            <form action={createUserAction} className="grid gap-3 sm:grid-cols-5">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-muted-foreground">Name (optional)</label>
                <Input name="name" placeholder="Jane Doe" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-muted-foreground">Email</label>
                <Input name="email" type="email" placeholder="user@example.com" required />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Role</label>
                <select
                  name="role"
                  defaultValue="USER"
                  className="w-full rounded-md border border-border bg-background p-2 text-sm"
                >
                  <option value="USER">USER</option>
                  <option value="LEADER">LEADER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-sm text-muted-foreground">Password</label>
                <Input name="password" type="password" placeholder="Minimum 8 characters" required />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <Button type="submit" className="w-full">Create User</Button>
              </div>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              New users won’t see courses until a Leader/Admin enrolls them.
            </p>
          </div>

          {/* Metrics */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Total users" value={total} />
            <Metric label="Admins" value={adminCount} />
            <Metric label="Page" value={`${page} / ${totalPages}`} />
          </div>

          <Separator className="bg-border" />

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-muted-foreground">
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Progress</Th>
                  <Th>Created</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: UserRow) => {
                  const isMe = u.email === me?.email;
                  const disableDemote = (u.role === "ADMIN" && adminCount <= 1) || isMe;
                  const disableDelete = disableDemote;

                  return (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <Td>{u.name ?? "—"}</Td>
                      <Td className="font-medium">{u.email}</Td>
                      <Td><RoleBadge role={u.role} /></Td>
                      <Td>
                        <span className="text-sm text-muted-foreground">
                          {u._count.progresses} / 8
                        </span>
                      </Td>
                      <Td>{new Date(u.createdAt).toLocaleDateString()}</Td>
                      <Td className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <ActionButton
                            label="Make USER"
                            variant="outline"
                            disabled={u.role === "USER" || disableDemote}
                            formAction={updateRoleAction}
                            payload={{ userId: u.id, nextRole: "USER" }}
                          />
                          <ActionButton
                            label="Make LEADER"
                            variant="outline"
                            disabled={u.role === "LEADER"}
                            formAction={updateRoleAction}
                            payload={{ userId: u.id, nextRole: "LEADER" }}
                          />
                          <ActionButton
                            label="Make ADMIN"
                            disabled={u.role === "ADMIN"}
                            formAction={updateRoleAction}
                            payload={{ userId: u.id, nextRole: "ADMIN" }}
                          />
                          <ActionButton
                            label="Reset Progress"
                            variant="outline"
                            formAction={resetProgressAction}
                            payload={{ userId: u.id }}
                          />
                          <ActionButton
                            label="Delete"
                            variant="destructive"
                            disabled={disableDelete}
                            formAction={deleteUserAction}
                            payload={{ userId: u.id }}
                          />
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing <b>{users.length}</b> of <b>{total}</b>
            </span>
            <div className="flex items-center gap-2">
              <a
                className={clsx(
                  "rounded-lg border border-border bg-background px-3 py-1.5 hover:bg-muted",
                  page <= 1 && "pointer-events-none opacity-50"
                )}
                href={`/admin?q=${encodeURIComponent(q)}&page=${Math.max(page - 1, 1)}`}
              >
                Prev
              </a>
              <span className="rounded-lg border border-border bg-muted px-3 py-1.5">
                {page} / {totalPages}
              </span>
              <a
                className={clsx(
                  "rounded-lg border border-border bg-background px-3 py-1.5 hover:bg-muted",
                  page >= totalPages && "pointer-events-none opacity-50"
                )}
                href={`/admin?q=${encodeURIComponent(q)}&page=${Math.min(page + 1, totalPages)}`}
              >
                Next
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

/* ---------- Server-safe UI helpers ---------- */

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={clsx("px-3 py-2", className)}>{children}</th>;
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx("px-3 py-2 align-middle", className)}>{children}</td>;
}

function RoleBadge({ role }: { role: string }) {
  const style =
    role === "ADMIN"
      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
      : role === "LEADER"
      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800";
  return <span className={clsx("rounded-full border px-2 py-0.5 text-xs", style)}>{role}</span>;
}

function ActionButton(props: {
  label: string;
  payload: Record<string, string>;
  formAction: (fd: FormData) => Promise<void>;
  variant?: "default" | "outline" | "destructive";
  disabled?: boolean;
}) {
  const { label, payload, formAction, variant = "default", disabled } = props;
  const isDestructive = variant === "destructive";
  const btnVariant = isDestructive ? "destructive" : variant === "outline" ? "outline" : "default";

  return (
    <form action={formAction}>
      {Object.entries(payload).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Button type="submit" variant={btnVariant as any} size="sm" disabled={disabled}>
        {label}
      </Button>
    </form>
  );
}
