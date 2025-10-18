// app/admin/requests/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Prisma, AccessRequestStatus, Role } from "@prisma/client";

type Search = Promise<Record<string, string | string[] | undefined>>;

type RequestRow = {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  status: AccessRequestStatus;
  message: string | null;
  course: { id: string; title: string; slug: string };
};

function parseStatus(input?: string | null): AccessRequestStatus | "ALL" | undefined {
  if (!input) return undefined;
  const s = input.toUpperCase();
  if (s === "ALL") return "ALL";
  if (s === "PENDING" || s === "APPROVED" || s === "REJECTED") return s as AccessRequestStatus;
  return undefined;
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  // Auth & role gate
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");
  const role = ((session.user ?? {}) as { role?: Role }).role ?? "USER";
  if (role !== "ADMIN" && role !== "LEADER") redirect("/forbidden");

  // Read query params safely
  const sp = await searchParams;
  const q = typeof sp["q"] === "string" ? sp["q"].trim() : "";
  const courseId = typeof sp["courseId"] === "string" ? sp["courseId"] : undefined;
  const statusParam = typeof sp["status"] === "string" ? sp["status"] : undefined;
  const statusParsed = parseStatus(statusParam);
  const pageStr = typeof sp["page"] === "string" ? sp["page"] : "1";
  const page = Math.max(1, Number.parseInt(pageStr, 10) || 1);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  // Build Prisma where with the correct enum type
  const where: Prisma.AccessRequestWhereInput = {};
  if (courseId) where.courseId = courseId;
  if (statusParsed && statusParsed !== "ALL") where.status = statusParsed;
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { course: { title: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, requests] = await Promise.all([
    prisma.accessRequest.count({ where }),
    prisma.accessRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        status: true, // <- enum type AccessRequestStatus
        message: true,
        course: { select: { id: true, title: true, slug: true } },
      },
    }),
  ]);

  const rows: RequestRow[] = requests; // matches the select shape
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Access Requests</CardTitle>
          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button variant="outline" size="sm">Users</Button>
            </Link>
            <Link href="/admin/courses">
              <Button variant="outline" size="sm">Courses</Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              {total.toLocaleString()} request{total === 1 ? "" : "s"}
              {statusParsed && statusParsed !== "ALL" ? <> • {statusParsed}</> : null}
              {courseId ? <> • course:{courseId.slice(0, 8)}…</> : null}
              {q ? <> • “{q}”</> : null}
            </div>
            <div>Page {page} / {totalPages}</div>
          </div>

          {/* List */}
          <div className="divide-y divide-border rounded-lg border border-border bg-background">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-5 sm:items-center">
                <div className="sm:col-span-2">
                  <div className="font-medium">{r.name ?? "—"}</div>
                  <div className="text-sm text-muted-foreground">{r.email}</div>
                </div>
                <div className="text-sm">
                  <Link className="underline" href={`/courses/${r.course.slug}`}>{r.course.title}</Link>
                </div>
                <div>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">{r.status}</span>
                </div>
                <div className="text-sm text-muted-foreground truncate" title={r.message ?? ""}>
                  {r.message ?? "—"}
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No access requests found.
              </div>
            )}
          </div>

          {/* Pager */}
          <div className="flex items-center justify-between">
            <PagerButton
              disabled={page <= 1}
              href={`/admin/requests?${new URLSearchParams({
                q,
                page: String(page - 1),
                courseId: courseId ?? "",
                status: statusParam ?? "",
              }).toString()}`}
            >
              Previous
            </PagerButton>
            <PagerButton
              disabled={page >= totalPages}
              href={`/admin/requests?${new URLSearchParams({
                q,
                page: String(page + 1),
                courseId: courseId ?? "",
                status: statusParam ?? "",
              }).toString()}`}
            >
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
