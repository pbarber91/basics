"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav className="mb-4 text-sm text-slate-600" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1">
        {trail.map((t, i) => (
          <li key={i} className="flex items-center">
            {t.href ? <Link className="hover:underline" href={t.href}>{t.label}</Link> : <span>{t.label}</span>}
            {i < trail.length - 1 && <span className="mx-2">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
