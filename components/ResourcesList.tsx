type Resource = { label: string; href: string; restricted?: "LEADER" | "ADMIN" };

export default function ResourcesList({
  items,
  role,
}: { items: Resource[]; role: "USER" | "LEADER" | "ADMIN" }) {
  const canSee = (r: Resource) =>
    !r.restricted ||
    (r.restricted === "LEADER" && (role === "LEADER" || role === "ADMIN")) ||
    (r.restricted === "ADMIN" && role === "ADMIN");

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-lg font-semibold">Resources</h3>
      <ul className="mt-2 space-y-2 text-sm">
        {items.filter(canSee).map((r) => (
          <li key={r.href}>
            <a className="underline hover:opacity-90" href={r.href} target="_blank" rel="noreferrer">
              {r.label}
            </a>
          </li>
        ))}
        {items.filter(canSee).length === 0 && (
          <li className="text-muted-foreground">No resources for your role.</li>
        )}
      </ul>
    </div>
  );
}
