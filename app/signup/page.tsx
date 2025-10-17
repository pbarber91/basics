// app/signup/page.tsx
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // If already signed in, bounce to home (or wherever you prefer)
  const session = await auth();
  if (session?.user) redirect("/");

  const { callbackUrl } = await searchParams;

  // ----- Server Action -----
  async function signUp(formData: FormData) {
    "use server";

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    // Basic validation
    if (!email || !password) {
      redirect("/signup?error=Missing+email+or+password");
    }
    if (password.length < 8) {
      redirect("/signup?error=Password+must+be+at+least+8+characters");
    }

    // Unique email check
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      redirect("/signup?error=That+email+is+already+registered");
    }

    // Create user as USER (no course access by default)
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hash,
        role: "USER",
      },
    });

    // After creating, send them to Sign In (optionally pass through callbackUrl)
    const to = callbackUrl ? `/signin?created=1&callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signin?created=1";
    redirect(to);
  }

  // ----- UI -----
  return (
    <div className="mx-auto max-w-md p-6">
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status / errors */}
          {/* In a real app you could read ?error= and show it here; doing it simply: */}
          {/* (Next automatically hydrates the query; optional to parse here) */}

          <form action={signUp} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Name (optional)</label>
              <Input name="name" placeholder="Jane Doe" />
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Email</label>
              <Input name="email" type="email" placeholder="you@example.com" required />
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Password</label>
              <Input name="password" type="password" placeholder="••••••••" required />
              <p className="mt-1 text-xs text-muted-foreground">Minimum 8 characters.</p>
            </div>

            <Button type="submit" className="w-full">Create account</Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/signin" className="underline">
              Sign in
            </Link>
          </p>

          <p className="text-xs text-muted-foreground">
            After creating an account, an Admin or Leader will enroll you in a course. Until then, you won’t see course content.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
