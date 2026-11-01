import Link from "next/link";
import Image from "next/image";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/ui/pagination";
import { formatPKR } from "@/lib/money";
import { btnPrimary, inputCls, badgeCls } from "@/components/ui/styles";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Products" };
const PER = 30;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireStaff("products");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {};
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { variants: { some: { sku: { contains: sp.q, mode: "insensitive" } } } }];
  if (sp.status === "DRAFT" || sp.status === "ACTIVE" || sp.status === "ARCHIVED") where.status = sp.status;
  if (sp.status === "LOW") where.totalStock = { lte: 5 };
  const [items, total] = await Promise.all([
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { images: { take: 1, orderBy: { position: "asc" } }, category: { select: { name: true } }, _count: { select: { variants: true } } } }),
    db.product.count({ where }),
  ]);
  return (
    <div>
      <PageHeader title="Products" description={`${total} products`} actions={<Link href="/admin/products/new" className={btnPrimary}>Add product</Link>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search name or SKU" className={`${inputCls} max-w-xs`} />
        <select name="status" defaultValue={sp.status ?? ""} className={`${inputCls} max-w-[180px]`}>
          <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option><option value="LOW">Low stock (≤5)</option>
        </select>
        <button className="rounded-lg border bg-white px-4 text-sm">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">Product</th><th>Status</th><th>Category</th><th>Price</th><th>Stock</th><th>Variants</th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-medium hover:text-brand-700">
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" />}</span>
                    {p.name}
                  </Link>
                </td>
                <td><span className={`${badgeCls} ${p.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>{p.status.toLowerCase()}</span></td>
                <td className="text-gray-600">{p.category?.name ?? "—"}</td>
                <td>{p.minPricePaisa === p.maxPricePaisa ? formatPKR(p.minPricePaisa) : `${formatPKR(p.minPricePaisa)} – ${formatPKR(p.maxPricePaisa)}`}</td>
                <td className={p.totalStock <= 5 ? "font-semibold text-red-600" : ""}>{p.totalStock}</td>
                <td>{p._count.variants}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-500">No products.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={Math.ceil(total / PER)} basePath="/admin/products" params={{ q: sp.q, status: sp.status }} />
    </div>
  );
}
