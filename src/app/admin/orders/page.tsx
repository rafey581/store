import Link from "next/link";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { expireDueOrders, methodLabel } from "@/server/orders";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/ui/pagination";
import { formatPKR } from "@/lib/money";
import { formatDate, orderLabel, normalizePkPhone } from "@/lib/utils";
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from "@/lib/order-status";
import { badgeCls, inputCls } from "@/components/ui/styles";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Orders" };
const PER = 30;
const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireStaff("orders");
  await expireDueOrders(50);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {};
  if (sp.status === "TO_SHIP") where.status = { in: ["PAID", "PROCESSING"] };
  else if (sp.status && STATUSES.includes(sp.status as OrderStatus)) where.status = sp.status as OrderStatus;
  const q = sp.q?.trim();
  if (q) {
    const n = Number(q.replace(/^#/, ""));
    where.OR = [
      ...(Number.isInteger(n) && n > 0 && n < 2_000_000_000 ? [{ number: n }] : []),
      { email: { contains: q.toLowerCase() } },
      { phone: { contains: normalizePkPhone(q) || q } },
      { customerName: { contains: q, mode: "insensitive" } },
      { trackingNumber: { contains: q } },
    ];
  }
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, select: { id: true, number: true, customerName: true, shipCity: true, totalPaisa: true, status: true, paymentMethod: true, createdAt: true } }),
    db.order.count({ where }),
  ]);
  return (
    <div>
      <PageHeader title="Orders" description={`${total} orders`} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Order #, name, email, phone, tracking" className={`${inputCls} max-w-xs`} />
        <select name="status" defaultValue={sp.status ?? ""} className={`${inputCls} max-w-[200px]`}>
          <option value="">All statuses</option>
          <option value="TO_SHIP">To ship (paid / processing)</option>
          {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </select>
        <button className="rounded-lg border bg-white px-4 text-sm">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">Order</th><th>Date</th><th>Customer</th><th>City</th><th>Payment</th><th>Status</th><th className="pr-3 text-right">Total</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t hover:bg-gray-50">
                <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">{orderLabel(o.number)}</Link></td>
                <td className="text-gray-600">{formatDate(o.createdAt)}</td>
                <td>{o.customerName}</td>
                <td>{o.shipCity}</td>
                <td className="text-gray-600">{methodLabel(o.paymentMethod)}</td>
                <td><span className={`${badgeCls} ${ORDER_STATUS_COLOR[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                <td className="pr-3 text-right font-medium">{formatPKR(o.totalPaisa)}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-gray-500">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={Math.ceil(total / PER)} basePath="/admin/orders" params={{ q: sp.q, status: sp.status }} />
    </div>
  );
}
