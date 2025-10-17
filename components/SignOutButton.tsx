// components/SignOutButton.tsx
"use client";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign out
    </Button>
  );
}
