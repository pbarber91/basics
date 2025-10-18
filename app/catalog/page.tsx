// app/catalog/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import * as React from "react";

// Simple styled textarea (no external import)
function TextArea(props: React.ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full rounded-md border border-border bg-background p-2 text-sm",
        props.className
      )}
    />
  );
}

type Role = "USER" | "LEADER" | "ADMIN";

type CourseCard = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  thumbnail: string | null;
  isPublished: boolean;
};

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const session = await auth();
  const role = (session?.user && (session.user as Record<string, unknown>)["role"]) as Role | undefined;

  // Public catalog page: show published courses to anyone (optionally enhance with role)
  const courses: CourseCard[] = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      thumbnail: true,
      isPublished: true,
    },
  });

  /* ---------- Server action: request access ---------- */
  async function requestAccess(formData: FormData) {
    "use server";
    const courseId = String(formData.get("courseId") || "");
    const name = String(formData.get("name") || "").trim(); // <- must be string, not null
    const email = String(formData.get("email") || "").toLowerCase().trim();
    const messageRaw = String(formData.get("message") || "").trim();
    const message: string | null = messageRaw.length > 0 ? messageRaw : null;

    if (!courseId || !email) return;

    await prisma.accessRequest.create({
      data: {
        courseId,
        name, // keep as string; if your Prisma field is nullable, string is still OK
        email,
        message, // stays nullable if your schema allows
        status: "PENDING",
      },
    });

    // Revalidate so the little badge/count, etc, can refresh if you show it somewhere
    revalidatePath("/catalog");
  }

  return (
    <section className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Course Catalog</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <article
              key={c.id}
              className="overflow-hidden rounded-xl border border-border bg-background"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.thumbnail ? (
                <img src={c.thumbnail} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 w-full bg-muted" />
              )}

              <div className="p-4 space-y-3">
                <header className="space-y-1">
                  <h3 className="text-lg font-semibold">{c.title}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {c.summary ?? ""}
                  </p>
                </header>

                <div className="flex items-center justify-between">
                  <Link href={`/courses/${c.slug}`}>
                    <Button size="sm">View</Button>
                  </Link>
                </div>

                <div className="pt-3 border-t border-border">
                  <form action={requestAccess} className="space-y-2">
                    <input type="hidden" name="courseId" value={c.id} />
                    <input
                      name="name"
                      placeholder="Your name (optional)"
                      className="w-full rounded-md border border-border bg-background p-2 text-sm"
                    />
                    <input
                      name="email"
                      type="email"
                      placeholder="Your email"
                      required
                      className="w-full rounded-md border border-border bg-background p-2 text-sm"
                    />
                    <TextArea
                      name="message"
                      rows={3}
                      placeholder="Why do you want access? (optional)"
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" variant="outline">
                        Request access
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </article>
          ))}

          {courses.length === 0 && (
            <div className="col-span-full rounded-xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
              No published courses yet.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
