import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireCustomer } from "@/server/auth/session";
import { ProfileForm, PasswordForm } from "@/components/store/account-forms";
import { logoutAction } from "@/app/(store)/(auth)/actions";
import { formatPKR } from "@/lib/money";
import { formatDate, orderLabel } from "@/lib/utils";
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from "@/lib/order-status";
import { badgeCls, cardCls } from "@/components/ui/styles";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireCustomer();
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, number: true, trackingToken: true, status: true, totalPaisa: true, createdAt: true } });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My account</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/account/addresses" className="text-brand-700 hover:underline">Addresses</Link>
          <form action={logoutAction}><button className="text-gray-600 hover:underline">Sign out</button></form>
        </div>
      </div>
      <section className={`${cardCls} p-5`}>
        <h2 className="mb-3 font-semibold">My orders</h2>
        {orders.length === 0 ? <p className="text-sm text-gray-500">No orders yet.</p> : (
          <ul className="divide-y text-sm">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <Link href={`/order/${o.trackingToken}`} className="font-medium text-brand-700 hover:underline">{orderLabel(o.number)}</Link>
                <span className="text-gray-500">{formatDate(o.createdAt, false)}</span>
                <span className={`${badgeCls} ${ORDER_STATUS_COLOR[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                <span className="font-semibold">{formatPKR(o.totalPaisa)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <section className={`${cardCls} p-5`}><h2 className="mb-3 font-semibold">Profile</h2><p className="mb-3 text-sm text-gray-600">{user.email}</p><ProfileForm name={user.name ?? ""} phone={user.phone ?? ""} /></section>
        <section className={`${cardCls} p-5`}><h2 className="mb-3 font-semibold">Password</h2><PasswordForm /></section>
      </div>
    </div>
  );
}
