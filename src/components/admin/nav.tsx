"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; badge?: number };

export function AdminNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {items.map((it) => {
        const active = it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${active ? "bg-brand-50 font-semibold text-brand-800" : "text-gray-700 hover:bg-gray-100"}`}>
            {it.label}
            {it.badge ? <span className="rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">{it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
