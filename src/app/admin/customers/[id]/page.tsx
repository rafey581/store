import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { toggleCustomerDisabled } from "../actions";
import { formatPKR } from "@/lib/money";
import { formatDate, orderLabel } from "@/lib/utils";
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from "@/lib/order-status";
import { badgeCls, cardCls, btnSecondary } from "@/components/ui/styles";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("customers");
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, include: { addresses: true, orders: { orderBy: { createdAt: "desc" }, take: 100 } } });
  if (!u || u.role !== "CUSTOMER") notFound();
  const paid = u.orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.totalPaisa, 0);
  return (
    <div className="space-y-6">
      <PageHeader title={u.name || u.email} description={`${u.email} · joined ${formatDate(u.createdAt, false)} · paid total ${formatPKR(paid)}`} actions={<form action={toggleCustomerDisabled}><input type="hidden" name="id" value={u.id} /><button className={btnSecondary}>{u.disabledAt ? "Enable account" : "Disable account"}</button></form>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`${cardCls} p-5 lg:col-span-2`}>
          <h2 className="mb-3 font-semibold">Orders</h2>
          <ul className="divide-y text-sm">
            {u.orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/admin/orders/${o.id}`} className="font-medium text-brand-700 hover:underline">{orderLabel(o.number)}</Link>
                <span className="text-gray-500">{formatDate(o.createdAt, false)}</span>
                <span className={`${badgeCls} ${ORDER_STATUS_COLOR[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                <span>{formatPKR(o.totalPaisa)}</span>
              </li>
            ))}
            {u.orders.length === 0 && <li className="py-2 text-gray-500">No orders.</li>}
          </ul>
        </section>
        <section className={`${cardCls} space-y-3 p-5 text-sm`}>
          <h2 className="font-semibold">Contact</h2>
          <p>{u.phone ?? "No phone"}</p>
          <h2 className="pt-2 font-semibold">Addresses</h2>
          {u.addresses.map((a) => <p key={a.id} className="rounded bg-gray-50 p-2">{a.fullName}, {a.line1}, {a.city} · {a.phone}</p>)}
          {u.addresses.length === 0 && <p className="text-gray-500">None saved.</p>}
        </section>
      </div>
    </div>
  );
}
