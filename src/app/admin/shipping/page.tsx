import Link from "next/link";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { getSettings } from "@/server/settings";
import { PageHeader } from "@/components/admin/page-header";
import { ShippingRow } from "@/components/admin/shipping-form";
import { deleteShippingRate } from "./actions";
import { formatPKR, paisaToRupeeInput } from "@/lib/money";
import { cardCls } from "@/components/ui/styles";

export const metadata = { title: "Shipping rates" };

export default async function ShippingPage() {
  await requireStaff("shipping");
  const [rates, s] = await Promise.all([db.shippingRate.findMany({ orderBy: { city: "asc" } }), getSettings()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Shipping rates by city" description={`Cities not listed pay the default fee of ${formatPKR(s.defaultShippingPaisa)}${s.freeShippingAbovePaisa ? `; free above ${formatPKR(s.freeShippingAbovePaisa)}` : ""}. Change defaults in Store settings.`} actions={<Link href="/admin/settings" className="text-sm text-brand-700 hover:underline">Store settings</Link>} />
      <section className={`${cardCls} overflow-x-auto p-4`}>
        <div className="hidden grid-cols-[1.5fr_1.5fr_1fr_1fr_0.6fr_0.6fr_auto_auto] gap-2 pb-2 text-xs font-medium uppercase text-gray-500 sm:grid"><span>City</span><span>Province</span><span>Fee (Rs)</span><span>Free above</span><span>Min days</span><span>Max days</span><span /><span /></div>
        <ShippingRow />
        {rates.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <div className="flex-1"><ShippingRow r={{ id: r.id, city: r.city, province: r.province ?? "", fee: paisaToRupeeInput(r.feePaisa), freeAbove: paisaToRupeeInput(r.freeShippingAbovePaisa), minDays: r.minDays, maxDays: r.maxDays, isActive: r.isActive }} /></div>
            <form action={deleteShippingRate}><input type="hidden" name="id" value={r.id} /><button className="text-xs text-red-600 hover:underline" aria-label={`Delete ${r.city}`}>Delete</button></form>
          </div>
        ))}
      </section>
    </div>
  );
}
