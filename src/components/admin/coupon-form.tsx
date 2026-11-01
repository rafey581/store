"use client";
import { useActionState, useState } from "react";
import { saveCoupon } from "@/app/admin/coupons/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { inputCls, labelCls } from "@/components/ui/styles";

export type CouponFormValues = { id?: string; code: string; description: string; type: "PERCENT" | "FIXED" | "FREE_SHIPPING"; value: string; minSubtotal: string; maxDiscount: string; startsAt: string; endsAt: string; usageLimit: string; perCustomerLimit: string; isActive: boolean };

export function CouponForm({ c }: { c?: CouponFormValues }) {
  const [state, action] = useActionState(saveCoupon, null);
  const [type, setType] = useState(c?.type ?? "PERCENT");
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      {c?.id && <input type="hidden" name="id" value={c.id} />}
      <div><label className={labelCls}>Code</label><input name="code" required defaultValue={c?.code} className={`${inputCls} uppercase`} /></div>
      <div><label className={labelCls}>Type</label>
        <select name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className={inputCls}>
          <option value="PERCENT">Percent off</option><option value="FIXED">Fixed amount off</option><option value="FREE_SHIPPING">Free shipping</option>
        </select>
      </div>
      {type !== "FREE_SHIPPING" && <div><label className={labelCls}>{type === "PERCENT" ? "Percent (%)" : "Amount (Rs)"}</label><input name="value" defaultValue={c?.value} inputMode="decimal" className={inputCls} /></div>}
      <div><label className={labelCls}>Minimum order (Rs)</label><input name="minSubtotal" defaultValue={c?.minSubtotal} inputMode="decimal" className={inputCls} /></div>
      {type === "PERCENT" && <div><label className={labelCls}>Max discount (Rs)</label><input name="maxDiscount" defaultValue={c?.maxDiscount} inputMode="decimal" className={inputCls} /></div>}
      <div><label className={labelCls}>Starts (PKT)</label><input type="datetime-local" name="startsAt" defaultValue={c?.startsAt} className={inputCls} /></div>
      <div><label className={labelCls}>Ends (PKT)</label><input type="datetime-local" name="endsAt" defaultValue={c?.endsAt} className={inputCls} /></div>
      <div><label className={labelCls}>Total uses limit</label><input name="usageLimit" defaultValue={c?.usageLimit} inputMode="numeric" className={inputCls} /></div>
      <div><label className={labelCls}>Uses per customer</label><input name="perCustomerLimit" defaultValue={c?.perCustomerLimit} inputMode="numeric" className={inputCls} /></div>
      <div className="sm:col-span-2"><label className={labelCls}>Description (internal)</label><input name="description" defaultValue={c?.description} className={inputCls} /></div>
      <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="isActive" defaultChecked={c?.isActive ?? true} /> Active</label>
      <div className="flex items-center gap-3 sm:col-span-3"><SubmitButton>{c?.id ? "Save" : "Create coupon"}</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}
