"use client";
import { useActionState, useState } from "react";
import { trackAction } from "@/app/(store)/track/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { inputCls, labelCls } from "@/components/ui/styles";

export function TrackForm() {
  const [state, action] = useActionState(trackAction, null);
  const [v, setV] = useState({ number: "", contact: "" });
  return (
    <form action={action} className="space-y-4">
      <div><label className={labelCls} htmlFor="number">Order number</label><input id="number" name="number" placeholder="e.g. 10001" required className={inputCls} value={v.number} onChange={(e) => setV({ ...v, number: e.target.value })} /></div>
      <div><label className={labelCls} htmlFor="contact">Email or mobile number used for the order</label><input id="contact" name="contact" required className={inputCls} value={v.contact} onChange={(e) => setV({ ...v, contact: e.target.value })} /></div>
      <FormMessage state={state} />
      <SubmitButton className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white shadow-[var(--shadow-glow)] transition hover:bg-brand-700">Track order</SubmitButton>
    </form>
  );
}
