import Link from "next/link";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { PageForm } from "@/components/admin/page-form";
import { createDefaultPages } from "./actions";
import { formatDate } from "@/lib/utils";
import { cardCls, btnSecondary } from "@/components/ui/styles";

export const metadata = { title: "Pages" };

export default async function PagesAdmin() {
  await requireOwner();
  const pages = await db.page.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pages"
        description="About, contact and policy pages. Payment gateways usually require Privacy, Terms, Shipping and Refund pages before approving your merchant account."
        actions={<form action={createDefaultPages}><button className={btnSecondary}>Add missing default pages</button></form>}
      />
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">Title</th><th>URL</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3"><Link href={`/admin/pages/${p.id}`} className="font-medium text-brand-700 hover:underline">{p.title}</Link></td>
                <td className="text-gray-600">/pages/{p.slug}</td>
                <td>{p.isPublished ? (p.showInFooter ? "Published · footer" : "Published") : "Hidden"}</td>
                <td className="text-gray-500">{formatDate(p.updatedAt)}</td>
              </tr>
            ))}
            {pages.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-gray-500">No pages yet. Click “Add missing default pages”.</td></tr>}
          </tbody>
        </table>
      </div>
      <section className={`${cardCls} p-5`}><h2 className="mb-3 font-semibold">New page</h2><PageForm /></section>
    </div>
  );
}
