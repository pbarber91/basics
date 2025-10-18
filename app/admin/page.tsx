// app/admin/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Role, Prisma } from "@prisma/client";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  // Require auth
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  // Only admins/leaders
  const role = ((session.user ?? {}) as { role?: Role }).role ?? "USER";
  if (role !== "ADMIN" && role !== "LEADER") redirect("/forbidden");

  // Read search params safely
  const sp = await searchParams;
  const q = typeof sp["q"] === "string" ? sp["q"].trim() : "";
  const pageStr = typeof sp["page"] === "string" ? sp["page"] : "1";
  const page = Math.max(1, Number.parseInt(pageStr, 10) || 1);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  // Build Prisma where with correct enum handling
  let where: Prisma.UserWhereInput | undefined = undefined;
  if (q) {
    const orParts: Prisma.UserWhereInput[] = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];

    // Optional role match: allow searching "admin", "leader", "user"
    const qLower = q.toLowerCase();
    const roleGuess: Role | undefined =
      qLower.startsWith("adm") ? "ADMIN" :
      qLower.startsWith("lea") ? "LEADER" :
      qLower.startsWith("use") ? "USER" : undefined;

    if (roleGuess) orParts.push({ role: roleGuess });

    where = { OR: orParts };
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Users</CardTitle>
          <div className="flex items-center gap-2">
            <Link href="/admin/courses">
              <Button variant="outline" size="sm">Courses</Button>
            </Link>
            <Link href="/admin/enroll">
              <Button variant="outline" size="sm">Enroll</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Results header */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              {total.toLocaleString()} user{total === 1 ? "" : "s"}
              {q ? <> matching “{q}”</> : null}
            </div>
            <div>
              Page {page} / {totalPages}
            </div>
          </div>

          {/* Table-ish list */}
          <div className="divide-y divide-border rounded-lg border border-border bg-background">
            {users.map((u) => (
              <div key={u.id} className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-4 sm:items-center">
                <div className="font-medium">{u.name ?? "—"}</div>
                <div className="text-sm text-muted-foreground">{u.email}</div>
                <div>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">{u.role}</span>
                </div>
                <div className="sm:text-right">
                  <Link href={`/admin/enroll?user=${encodeURIComponent(u.id)}`}>
                    <Button size="sm" variant="outline">Manage</Button>
                  </Link>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No users found.</div>
            )}
          </div>

          {/* Pager */}
          <div className="flex items-center justify-between">
            <PagerButton disabled={page <= 1} href={`/admin?q=${encodeURIComponent(q)}&page=${page - 1}`}>
              Previous
            </PagerButton>
            <PagerButton disabled={page >= totalPages} href={`/admin?q=${encodeURIComponent(q)}&page=${page + 1}`}>
              Next
            </PagerButton>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function PagerButton({
  disabled,
  href,
  children,
}: {
  disabled?: boolean;
  href: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <Button size="sm" variant="outline" disabled>{children}</Button>;
  }
  return (
    <Link href={href}>
      <Button size="sm" variant="outline">{children}</Button>
    </Link>
  );
}
