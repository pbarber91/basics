// app/catalog/page.tsx
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic"; // always show latest published courses

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ requested?: string }>;
}) {
  const { requested } = await searchParams;

  // Fetch all published courses with session counts
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      thumbnail: true,
      _count: { select: { sessions: true } },
    },
  });

  // Server action: create an access request
  async function requestAccess(formData: FormData) {
    "use server";

    const courseId = String(formData.get("courseId") || "");
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const message = String(formData.get("message") || "").trim();

    if (!courseId || !name || !email) {
      redirect("/catalog?requested=error");
    }

    await prisma.accessRequest.create({
      data: { courseId, name, email, message: message || null },
    });

    revalidatePath("/catalog");
    redirect("/catalog?requested=1");
  }

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Courses Catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Explore our available courses. Request access and a Leader/Admin will enroll you.
          </p>
          {requested === "1" && (
            <div className="rounded-md border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-300">
              Thanks! Your request was received. We’ll follow up soon.
            </div>
          )}
          {requested === "error" && (
            <div className="rounded-md border border-red-600/40 bg-red-600/10 px-3 py-2 text-sm text-red-300">
              Please provide your name and email.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <article key={c.id} className="overflow-hidden rounded-xl border border-border bg-card">
            {/* Thumb */}
            {c.thumbnail ? (
              <div className="relative h-40 w-full">
                {/* Using <img> to keep it simple; swap to next/image if your domain is configured */}
                {/* <Image src={c.thumbnail} alt="" fill className="object-cover" /> */}
                <img src={c.thumbnail} alt="" className="h-40 w-full object-cover" />
              </div>
            ) : (
              <div className="h-40 w-full bg-muted" />
            )}

            {/* Body */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">{c.title}</h3>
                <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {c._count.sessions} {c._count.sessions === 1 ? "session" : "sessions"}
                </span>
              </div>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{c.summary}</p>

              {/* Request access form (per-card) */}
              <form action={requestAccess} className="mt-4 grid gap-2">
                <input type="hidden" name="courseId" value={c.id} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input name="name" placeholder="Your name" required />
                  <Input name="email" type="email" placeholder="you@example.com" required />
                </div>
                <textarea
                  name="message"
                  placeholder="Optional message"
                  className="min-h-[70px] w-full rounded-md border border-border bg-background p-2 text-sm"
                />
                <div className="flex justify-end">
                  <Button type="submit">Request access</Button>
                </div>
              </form>
            </div>
          </article>
        ))}

        {courses.length === 0 && (
          <div className="col-span-full rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No published courses yet. Please check back later.
          </div>
        )}
      </div>
    </section>
  );
}
