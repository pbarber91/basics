// app/forbidden/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <section className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 text-center">
      <h1 className="text-2xl font-bold">Access denied</h1>
      <p className="text-muted-foreground">
        You’re signed in, but you don’t have permission to view this page.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/program">
          <Button>Go to Program</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Home</Button>
        </Link>
      </div>
    </section>
  );
}
