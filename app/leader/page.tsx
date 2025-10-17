import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LeaderHome() {
  const session = await auth();
  const role = (session?.user as any)?.role ?? "USER";
  if (role !== "LEADER" && role !== "ADMIN") redirect("/signin");

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold">Leader Resources</h1>
      <p className="text-slate-600">Facilitation notes, checklists, and downloads.</p>
      {/* links, files, etc. */}
    </section>
  );
}
