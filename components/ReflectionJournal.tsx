"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ReflectionJournal({
  weekNumber,
  prompts,
}: { weekNumber: number; prompts: string[] }) {
  const key = `journal-week-${weekNumber}`;
  const [entries, setEntries] = useState<string[]>(() => {
    if (typeof window === "undefined") return prompts.map(() => "");
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : prompts.map(() => "");
    } catch { return prompts.map(() => ""); }
  });

  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(entries)); } catch {}
  }, [entries]);

  const exportTxt = () => {
    const contents = prompts.map((p, i) => `Q${i+1}. ${p}\n${entries[i] || ""}`).join("\n\n");
    const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `week-${weekNumber}-reflection.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-lg font-semibold">Reflection (optional)</h3>
      <ol className="mt-3 space-y-3">
        {prompts.map((p, i) => (
          <li key={i}>
            <p className="text-sm text-muted-foreground">{p}</p>
            <textarea
              className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
              rows={3}
              value={entries[i] || ""}
              onChange={(e) => {
                const next = [...entries]; next[i] = e.target.value; setEntries(next);
              }}
            />
          </li>
        ))}
      </ol>
      <div className="mt-3">
        <Button variant="outline" size="sm" onClick={exportTxt}>Export as .txt</Button>
      </div>
    </div>
  );
}
