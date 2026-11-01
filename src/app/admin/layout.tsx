import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { can } from "@/lib/permissions";
import { db } from "@/server/db";
import { AdminNav } from "@/components/admin/nav";
import { logoutAction } from "@/app/(store)/(auth)/actions";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const [pendingProofs, settings] = await Promise.all([db.paymentProof.count({ where: { status: "PENDING" } }), getSettings()]);
  const items = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/proofs", label: "Payment proofs", badge: pendingProofs },
    { href: "/admin/products", label: "Products" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/coupons", label: "Coupons" },
    { href: "/admin/shipping", label: "Shipping rates" },
    ...(can(user.role, "settings") ? [{ href: "/admin/settings", label: "Store settings" }, { href: "/admin/pages", label: "Pages" }] : []),
    ...(can(user.role, "staff") ? [{ href: "/admin/staff", label: "Staff" }, { href: "/admin/audit", label: "Activity log" }] : []),
    { href: "/admin/help-developer", label: "Help for Developer" },
  ];
  const initials = (user.name || user.email).split(/[\s@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <div className="min-h-screen bg-[#f6f7f9] md:flex">
      <aside className="bg-ink-900 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
        <details className="md:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-white">
            <span className="font-extrabold">{settings.storeName} <span className="font-medium text-gray-400">Admin</span></span>
            <span className="rounded-lg bg-white/10 px-3 py-1 text-sm">Menu</span>
          </summary>
          <div className="px-3 pb-4"><AdminNav items={items} /></div>
        </details>
        <div className="hidden px-5 pb-4 pt-6 md:block">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-extrabold text-white">{settings.storeName.slice(0, 1)}</span>
            <span className="leading-tight">
              <span className="block font-extrabold text-white">{settings.storeName}</span>
              <span className="block text-xs text-gray-500">Admin panel</span>
            </span>
          </Link>
        </div>
        <div className="hidden flex-1 overflow-y-auto px-3 md:block"><AdminNav items={items} /></div>
        <div className="hidden border-t border-white/10 p-4 md:block">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-bold text-white">{initials}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.name || user.email}</p>
              <p className="text-xs text-gray-500">{user.role === "OWNER" ? "Owner" : "Staff"}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <Link href="/" className="flex-1 rounded-lg bg-white/5 py-1.5 text-center text-gray-300 hover:bg-white/10">View store</Link>
            <form action={logoutAction} className="flex-1"><button className="w-full rounded-lg bg-white/5 py-1.5 text-gray-300 hover:bg-white/10">Sign out</button></form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
