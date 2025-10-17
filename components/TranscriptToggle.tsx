"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TranscriptToggle({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Transcript</h4>
        <Button size="sm" variant="outline" onClick={() => setOpen(v => !v)}>
          {open ? "Hide" : "Show"}
        </Button>
      </div>
      {open && (
        <div className="prose prose-slate dark:prose-invert mt-3 max-w-none text-sm">
          {text}
        </div>
      )}
    </div>
  );
}
