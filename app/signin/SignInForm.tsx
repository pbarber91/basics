// app/signin/SignInForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignInForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: callbackUrl || params.get("callbackUrl") || "/",
    });

    if (!res) {
      setLocalError("Unable to reach the server. Please try again.");
      return;
    }
    if (res.error) {
      setLocalError(mapError(res.error));
      return;
    }

    // success
    if (res.url) {
      startTransition(() => router.push(res.url!));
    } else {
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {localError ? (
        <div className="rounded-md border border-red-600/40 bg-red-600/10 px-3 py-2 text-sm text-red-300">
          {localError}
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-sm text-muted-foreground">Email</label>
        <Input
          name="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-muted-foreground">Password</label>
        <Input
          name="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function mapError(code?: string) {
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
