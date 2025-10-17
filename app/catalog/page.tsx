// app/catalog/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clsx from "clsx";

// Simple styled textarea (no external import)
function TextArea(props: React.ComponentPropsWithoutRef("textarea")) {
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

// ---------- Types ----------
type CourseCard = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  thumbnail: string | null;
  isPublished: boolean;
  _count: {
    sessions: number;
    enrollments: number;
  };
};

// ---------- Server action to create an access request ----------
async function requestAccess(formData: FormData) {
  "use server";

  const session = await auth();

  const courseId = String(formData.get("courseId") || "");
  const nameRaw = String(formData.get("name") || "").trim();
  const emailRaw = String(formData.get("email") || "").trim().toLowerCase();
  const message = String(formData.get("message") || "").trim();

  if (!courseId) return;

  const name = nameRaw || (session?.user?.name ?? "");
  const email = emailRaw || (session?.user?.email ?? "");

  if (!email) {
    redirect("/signin?callbackUrl=/catalog");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId, isPublished: true },
    select: { id: true },
  });
  if (!course) return;

  await prisma.accessRequest.create({
    data: {
      courseId,
      name: name || null,
      email,
      message: message || null,
      status: "PENDING",
    },
  });

  revalidatePath("/catalog");
}

// ---------- Page ----------
export default async function CatalogPage() {
  const session = await auth();

  const courses: CourseCard[] = await prisma.course.findMany({
    where: { isPublished: true },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      thumbnail: true,
      isPublished: true,
      _count: { select: { sessions: true, enrollments: true } },
    },
  });

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-bold">Courses</h1>
        <p className="text-sm text-muted-foreground">
          Browse available courses. You can request access and a Leader or Admin will enroll you.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c: CourseCard) => (
          <article
            key={c.id}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            {/* Thumbnail */}
            {c.thumbnail ? (
              <div className="relative aspect-[16/9] w-full">
                <Image
                  src={c.thumbnail}
                  alt={c.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center bg-muted text-muted-foreground">
                No image
              </div>
            )}

            <CardHeader className="pb-0">
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="truncate">{c.title}</span>
                <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {c._count.sessions} session{c._count.sessions === 1 ? "" : "s"}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="min-h-12 text-sm text-muted-foreground">
                {c.summary ?? "No description yet."}
              </p>

              <div className="flex items-center gap-2">
                <Link
                  href={`/courses/${c.slug}`}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                >
                  Learn more
                </Link>
              </div>

              {/* Request Access form */}
              <div className="rounded-lg border border-border bg-background p-3">
                <h3 className="mb-2 text-sm font-medium">Request access</h3>
                <form action={requestAccess} className="grid gap-2">
                  <input type="hidden" name="courseId" value={c.id} />
                  {!session?.user && (
                    <>
                      <div className="grid gap-1">
                        <label className="text-xs text-muted-foreground">Name</label>
                        <Input name="name" placeholder="Your name" />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs text-muted-foreground">Email</label>
                        <Input
                          name="email"
                          type="email"
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </>
                  )}
                  <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">Message (optional)</label>
                    <TextArea
                      name="message"
                      placeholder="Any context you'd like to share…"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm">Request Access</Button>
                  </div>
                </form>
                {!session?.user && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <Link className="underline" href="/signin?callbackUrl=/catalog">
                      Sign in
                    </Link>
                    .
                  </p>
                )}
              </div>
            </CardContent>
          </article>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No courses are published yet.
        </div>
      )}
    </section>
  );
}
