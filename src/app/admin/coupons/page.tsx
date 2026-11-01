import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { CouponForm } from "@/components/admin/coupon-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteCoupon } from "./actions";
import { formatPKR, paisaToRupeeInput } from "@/lib/money";
import { cardCls } from "@/components/ui/styles";

export const metadata = { title: "Coupons" };

const toLocal = (d: Date | null) => (d ? new Date(d.getTime() + 5 * 3600_000).toISOString().slice(0, 16) : "");

export default async function CouponsPage() {
  await requireStaff("coupons");
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="Coupons" />
      <section className={`${cardCls} p-5`}><h2 className="mb-3 font-semibold">New coupon</h2><CouponForm /></section>
      {coupons.map((c) => (
        <details key={c.id} className={`${cardCls} p-4`}>
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-sm">
            <span><b className="font-mono">{c.code}</b> · {c.type === "PERCENT" ? `${c.value / 100}% off${c.maxDiscountPaisa ? ` (max ${formatPKR(c.maxDiscountPaisa)})` : ""}` : c.type === "FIXED" ? `${formatPKR(c.value)} off` : "Free shipping"}{c.minSubtotalPaisa ? ` · min ${formatPKR(c.minSubtotalPaisa)}` : ""} · used {c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""}</span>
            <span className={c.isActive ? "text-emerald-700" : "text-gray-500"}>{c.isActive ? "Active" : "Inactive"} · Edit</span>
          </summary>
          <div className="mt-4 border-t pt-4">
            <CouponForm c={{ id: c.id, code: c.code, description: c.description ?? "", type: c.type, value: c.type === "PERCENT" ? String(c.value / 100) : c.type === "FIXED" ? paisaToRupeeInput(c.value) : "", minSubtotal: paisaToRupeeInput(c.minSubtotalPaisa || null), maxDiscount: paisaToRupeeInput(c.maxDiscountPaisa), startsAt: toLocal(c.startsAt), endsAt: toLocal(c.endsAt), usageLimit: c.usageLimit?.toString() ?? "", perCustomerLimit: c.perCustomerLimit?.toString() ?? "", isActive: c.isActive }} />
            <form action={deleteCoupon} className="mt-3"><input type="hidden" name="id" value={c.id} /><ConfirmButton message="Delete this coupon? If it was used, it will be deactivated instead." className="text-sm text-red-600 hover:underline">Delete</ConfirmButton></form>
          </div>
        </details>
      ))}
    </div>
  );
}
