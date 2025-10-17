export default function ProgressChip({ current, total }: { current: number; total: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((current / Math.max(total, 1)) * 100)));
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
      <span className="inline-block h-2 w-24 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-muted-foreground">{current}/{total}</span>
    </span>
  );
}
