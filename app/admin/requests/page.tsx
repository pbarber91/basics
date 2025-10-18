// app/admin/requests/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Prisma } from "@prisma/client";

type Role = "USER" | "LEADER" | "ADMIN";
const STATUS_VALUES = ["PENDING", "APPROVED", "REJECTED"] as const;
type RequestStatus = (typeof STATUS_VALUES)[number] | "ALL";

type SearchParams = {
  q?: string;
  status?: RequestStatus;
  courseId?: string;
  page?: string;
};

export default async function AdminRequestsPage({
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
  const status: RequestStatus =
    (STATUS_VALUES.includes(sp.status as any) ? (sp.status as RequestStatus) : "ALL") ?? "ALL";
  const courseId = typeof sp.courseId === "string" ? sp.courseId : undefined;
  const page = Number.parseInt(sp.page ?? "1", 10) || 1;
  const take = 12;
  const skip = (page - 1) * take;

  // Build Prisma-safe where
  let where: Prisma.AccessRequestWhereInput | undefined;
  {
    const ands: Prisma.AccessRequestWhereInput[] = [];
    if (courseId) ands.push({ courseId });
    if (status !== "ALL") ands.push({ status }); // status is a String in your schema
    if (q) {
      ands.push({
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
          { message: { contains: q, mode: "insensitive" as const } },
        ],
      });
    }
    where = ands.length ? { AND: ands } : undefined;
  }

  const [total, requests, courses] = await Promise.all([
    prisma.accessRequest.count({ where }),
    prisma.accessRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        name: true,
        email: true,
        message: true,
        status: true,
        createdAt: true,
        course: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.course.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / take));

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Access Requests</CardTitle>
          <Link href="/admin">
            <Button size="sm" variant="outline">Back to Admin</Button>
          </Link>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              name="q"
              placeholder="Search name, email, or message…"
              defaultValue={q}
              className="sm:w-72"
            />
            <select
              name="status"
              defaultValue={status}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select
              name="courseId"
              defaultValue={courseId}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <Button type="submit">Apply</Button>
          </form>

          {/* List */}
          {requests.length === 0 ? (
            <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              No requests match your filters.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-background">
              {requests.map((r) => (
                <li key={r.id} className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name ?? "Unnamed"}</span>
                      <StatusBadge status={r.status as RequestStatus} />
                    </div>
                    <div className="text-sm text-muted-foreground">{r.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Course:{" "}
                      <Link href={`/courses/${r.course.slug}`} className="underline">
                        {r.course.title}
                      </Link>
                    </div>
                    {r.message && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {r.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-start justify-start gap-2 sm:justify-end">
                    {/* Wire these to actions when you add mutations */}
                    <Button size="sm" variant="outline" disabled={r.status !== "PENDING"}>
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" disabled={r.status !== "PENDING"}>
                      Reject
                    </Button>
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
                <PageLink disabled={page <= 1} href={makeHref({ q, status, courseId, page: page - 1 })}>
                  Previous
                </PageLink>
                <PageLink disabled={page >= pages} href={makeHref({ q, status, courseId, page: page + 1 })}>
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

function StatusBadge({ status }: { status: RequestStatus }) {
  const map: Record<Exclude<RequestStatus, "ALL">, string> = {
    PENDING: "bg-amber-500/15 text-amber-400",
    APPROVED: "bg-emerald-500/15 text-emerald-300",
    REJECTED: "bg-red-500/15 text-red-400",
  };
  if (status === "ALL") return null;
  return <span className={`rounded px-2 py-0.5 text-xs ${map[status]}`}>{status}</span>;
}

function makeHref({
  q,
  status,
  courseId,
  page,
}: {
  q?: string;
  status?: RequestStatus;
  courseId?: string;
  page: number;
}) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (status && status !== "ALL") p.set("status", status);
  if (courseId) p.set("courseId", courseId);
  p.set("page", String(page));
  return `/admin/requests?${p.toString()}`;
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
