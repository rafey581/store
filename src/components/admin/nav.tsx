"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, BadgeCheck, Package, FolderTree, Users, TicketPercent, Truck, Settings, FileText, UserCog, History, HeartHandshake, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/orders": ShoppingCart,
  "/admin/proofs": BadgeCheck,
  "/admin/products": Package,
  "/admin/categories": FolderTree,
  "/admin/customers": Users,
  "/admin/coupons": TicketPercent,
  "/admin/shipping": Truck,
  "/admin/settings": Settings,
  "/admin/pages": FileText,
  "/admin/staff": UserCog,
  "/admin/audit": History,
  "/admin/help-developer": HeartHandshake,
};

type Item = { href: string; label: string; badge?: number };

export function AdminNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {items.map((it) => {
        const active = it.href === "/admin" ? pathname === "/admin" : pathname.startsWith(it.href);
        const Icon = ICONS[it.href] ?? LayoutDashboard;
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
            <Icon size={18} className={active ? "text-brand-400" : "text-gray-500 group-hover:text-gray-300"} />
            <span className="flex-1">{it.label}</span>
            {it.badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sale px-1.5 text-[11px] font-bold text-white">{it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
