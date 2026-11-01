import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} className="text-gray-300" />}
            {it.href ? <Link href={it.href} className="hover:text-ink-900">{it.label}</Link> : <span className="font-medium text-ink-900" aria-current="page">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
