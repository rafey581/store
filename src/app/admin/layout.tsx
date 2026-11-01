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
    ...(can(user.role, "settings") ? [{ href: "/admin/settings", label: "Store settings" }] : []),
    ...(can(user.role, "staff") ? [{ href: "/admin/staff", label: "Staff" }] : []),
    { href: "/admin/help-developer", label: "Help for Developer" },
  ];
  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      <aside className="border-b border-gray-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r">
        <details className="md:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
            <span className="font-bold text-brand-700">{settings.storeName} Admin</span>
            <span className="text-sm text-gray-600">Menu ☰</span>
          </summary>
          <div className="px-3 pb-3"><AdminNav items={items} /></div>
        </details>
        <div className="hidden p-4 md:block">
          <Link href="/admin" className="mb-4 block font-bold text-brand-700">{settings.storeName} Admin</Link>
          <AdminNav items={items} />
          <div className="mt-6 border-t pt-4 text-xs text-gray-500">
            <p className="truncate font-medium text-gray-800">{user.name || user.email}</p>
            <p>{user.role === "OWNER" ? "Owner" : "Staff"}</p>
            <div className="mt-2 flex gap-3">
              <Link href="/" className="hover:underline">View store</Link>
              <form action={logoutAction}><button className="hover:underline">Sign out</button></form>
            </div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
