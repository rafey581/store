import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";
import { inputCls } from "@/components/ui/styles";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Activity log" };
const PER = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff("staff"); // Owner only
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.AuditLogWhereInput = sp.q ? { OR: [{ action: { contains: sp.q } }, { entityType: { contains: sp.q, mode: "insensitive" } }, { actor: { email: { contains: sp.q.toLowerCase() } } }] } : {};
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { actor: { select: { name: true, email: true } } } }),
    db.auditLog.count({ where }),
  ]);
  return (
    <div>
      <PageHeader title="Activity log" description="Who changed what in the admin panel and the mobile app." />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Action, type or staff email" className={`${inputCls} max-w-xs`} /><button className="rounded-lg border bg-white px-4 text-sm">Search</button></form>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">When</th><th>Who</th><th>Action</th><th>Item</th><th>Details</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="whitespace-nowrap p-3 text-gray-600">{formatDate(r.createdAt)}</td>
                <td>{r.actor?.name || r.actor?.email || "System"}</td>
                <td className="font-mono text-xs">{r.action}</td>
                <td className="text-gray-600">{r.entityType}{r.entityId ? ` ${r.entityId.slice(0, 10)}…` : ""}</td>
                <td className="max-w-xs truncate font-mono text-xs text-gray-500">{r.data ? JSON.stringify(r.data) : ""}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={Math.ceil(total / PER)} basePath="/admin/audit" params={{ q: sp.q }} />
    </div>
  );
}
