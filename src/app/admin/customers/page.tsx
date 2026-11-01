import Link from "next/link";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/ui/pagination";
import { formatPKR } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { inputCls } from "@/components/ui/styles";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Customers" };
const PER = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff("customers");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = { role: "CUSTOMER" };
  if (sp.q) where.OR = [{ email: { contains: sp.q.toLowerCase() } }, { name: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }];
  const [users, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, select: { id: true, name: true, email: true, phone: true, createdAt: true, disabledAt: true, _count: { select: { orders: true } } } }),
    db.user.count({ where }),
  ]);
  const spent = users.length ? await db.order.groupBy({ by: ["userId"], where: { userId: { in: users.map((u) => u.id) }, paymentStatus: "PAID" }, _sum: { totalPaisa: true } }) : [];
  return (
    <div>
      <PageHeader title="Customers" description={`${total} registered customers. Guest orders appear under Orders.`} />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Name, email, phone" className={`${inputCls} max-w-xs`} /><button className="rounded-lg border bg-white px-4 text-sm">Search</button></form>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">Customer</th><th>Phone</th><th>Joined</th><th>Orders</th><th className="pr-3 text-right">Paid total</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="p-3"><Link href={`/admin/customers/${u.id}`} className="font-medium text-brand-700 hover:underline">{u.name || "—"}</Link><div className="text-xs text-gray-500">{u.email}{u.disabledAt ? " · disabled" : ""}</div></td>
                <td>{u.phone ?? "—"}</td>
                <td className="text-gray-600">{formatDate(u.createdAt, false)}</td>
                <td>{u._count.orders}</td>
                <td className="pr-3 text-right">{formatPKR(spent.find((s) => s.userId === u.id)?._sum.totalPaisa ?? 0)}</td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No customers.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={Math.ceil(total / PER)} basePath="/admin/customers" params={{ q: sp.q }} />
    </div>
  );
}
