"use client";
import { useActionState } from "react";
import { applyCoupon, removeCoupon } from "@/app/(store)/cart/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { btnSecondary, inputCls } from "@/components/ui/styles";

export function CouponForm({ applied, error }: { applied: string | null; error: string | null }) {
  const [state, action] = useActionState(applyCoupon, null);
  if (applied) {
    return (
      <form action={removeCoupon} className="flex items-center justify-between rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">
        <span>Coupon <b>{applied}</b> applied</span>
        <button className="font-semibold text-sale hover:underline">Remove</button>
      </form>
    );
  }
  return (
    <div className="space-y-2">
      {error && (
        <form action={removeCoupon} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span>{error}</span>
          <button className="underline">Remove</button>
        </form>
      )}
      <form action={action} className="flex gap-2">
        <input name="code" placeholder="Coupon code" aria-label="Coupon code" className={`${inputCls} uppercase`} />
        <SubmitButton className={btnSecondary}>Apply</SubmitButton>
      </form>
      <FormMessage state={state} />
    </div>
  );
}
