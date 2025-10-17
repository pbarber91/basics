// app/signin/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SignInForm from "./SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; created?: string }>;
}) {
  // Already signed in? Send them home (or wherever you prefer)
  const session = await auth();
  if (session?.user) redirect("/");

  const { callbackUrl, error, created } = await searchParams;

  return (
    <div className="mx-auto max-w-md p-6">
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">Sign in to your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          {created ? (
            <div className="rounded-md border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-300">
              Account created. Please sign in.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-red-600/40 bg-red-600/10 px-3 py-2 text-sm text-red-300">
              {friendlyError(error)}
            </div>
          ) : null}

          {/* Client form */}
          <SignInForm callbackUrl={callbackUrl} />

          <div className="text-center text-sm text-muted-foreground">
            Don’t have an account?{" "}
            <Link
              href={callbackUrl ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signup"}
              className="underline"
            >
              Sign up
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            New accounts won’t see course content until a Leader/Admin enrolls them.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function friendlyError(code?: string) {
  switch (code) {
    case "CredentialsSignin":
      return "Sign-in failed. Check your email and password.";
    case "UnsupportedStrategy":
      return "Sign-in method not available.";
    case "MissingCSRF":
      return "Security token missing. Please refresh and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
