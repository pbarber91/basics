// app/admin/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Prisma } from "@prisma/client";

type Role = "USER" | "LEADER" | "ADMIN";

type SearchParams = {
  q?: string;
  role?: Role | "ALL";
  page?: string;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await auth();
  const me = session?.user;
  const myRole: Role = ((me ?? {}) as { role?: Role }).role ?? "USER";
  if (!me?.email || (myRole !== "ADMIN" && myRole !== "LEADER")) {
    redirect("/forbidden");
  }

  const sp = (await searchParams) ?? {};
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const roleFilter = (sp.role as Role | "ALL" | undefined) ?? "ALL";
  const page = Number.parseInt(sp.page ?? "1", 10) || 1;
  const take = 12;
  const skip = (page - 1) * take;

  // ----- Prisma-safe where clause (explicit literal types for mode, proper AND/OR typing)
  let where: Prisma.UserWhereInput | undefined;
  {
    const conditions: Prisma.UserWhereInput[] = [];

    if (roleFilter !== "ALL") {
      conditions.push({ role: roleFilter });
    }

    if (q) {
      const orParts: Prisma.UserWhereInput[] = [
        { email: { contains: q, mode: "insensitive" as const } },
        { name: { contains: q, mode: "insensitive" as const } },
      ];
      conditions.push({ OR: orParts });
    }

    where = conditions.length ? { AND: conditions } : undefined;
  }
  // -----

  const [total, users, adminCount, leaderCount, userCount, courseCount, requestCounts] =
    await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "LEADER" } }),
      prisma.user.count({ where: { role: "USER" } }),
      prisma.course.count(),
      prisma.accessRequest.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

  const pages = Math.max(1, Math.ceil(total / take));
  const pendingRequests =
    requestCounts.find((r) => r.status === "PENDING")?._count._all ?? 0;

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Courses" value={courseCount} />
          <Stat label="Admins" value={adminCount} />
          <Stat label="Leaders" value={leaderCount} />
          <Stat label="Users" value={userCount} />
          <Stat
            label="Pending Requests"
            value={pendingRequests}
            href="/admin/requests"
          />
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>People</CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <form className="flex w-full gap-2">
              <Input
                name="q"
                placeholder="Search name or email…"
                defaultValue={q}
                className="sm:w-64"
              />
              <select
                name="role"
                defaultValue={roleFilter}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="ALL">All roles</option>
                <option value="ADMIN">Admins</option>
                <option value="LEADER">Leaders</option>
                <option value="USER">Users</option>
              </select>
              <Button type="submit">Filter</Button>
            </form>
            <Link href="/admin/enroll">
              <Button variant="outline">Enroll people</Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3">
          {users.length === 0 ? (
            <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              No users match your filters.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-background">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.name ?? "Unnamed"}</span>
                      <RoleBadge role={u.role as Role} />
                    </div>
                    <div className="text-sm text-muted-foreground">{u.email}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Enrollments: {u._count.enrollments}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-self-start sm:justify-self-end">
                    <Link href={`/admin/enroll?user=${encodeURIComponent(u.email)}`}>
                      <Button size="sm" variant="outline">
                        Enroll
                      </Button>
                    </Link>
                    <Link href={`/admin/courses`}>
                      <Button size="sm" variant="ghost">
                        Courses
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Page {page} of {pages} • {total} total
              </span>
              <div className="flex gap-2">
                <PageLink
                  disabled={page <= 1}
                  href={makePageHref(q, roleFilter, page - 1)}
                >
                  Previous
                </PageLink>
                <PageLink
                  disabled={page >= pages}
                  href={makePageHref(q, roleFilter, page + 1)}
                >
                  Next
                </PageLink>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    ADMIN: "bg-red-500/15 text-red-400",
    LEADER: "bg-blue-500/15 text-blue-300",
    USER: "bg-emerald-500/15 text-emerald-300",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${styles[role]}`}>{role}</span>
  );
}

function makePageHref(q: string, role: Role | "ALL", page: number) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (role !== "ALL") p.set("role", role);
  p.set("page", String(page));
  return `/admin?${p.toString()}`;
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded border border-border px-2 py-1 text-sm text-muted-foreground">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded border border-border bg-background px-2 py-1 text-sm hover:bg-accent"
    >
      {children}
    </Link>
  );
}
