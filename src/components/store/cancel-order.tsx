"use client";
import { useActionState, useState } from "react";
import { cancelOrderAction } from "@/app/(store)/order/actions";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function CancelOrder({ token }: { token: string }) {
  const [state, action] = useActionState(cancelOrderAction, null);
  const [open, setOpen] = useState(false);
  if (state?.ok) return <FormMessage state={state} />;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-sm text-red-600 hover:underline">Cancel this order</button>;
  return (
    <form action={action} className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-red-800">Are you sure you want to cancel this order?</p>
      <input name="reason" maxLength={200} placeholder="Reason (optional)" className="w-full rounded border px-2 py-1.5 text-sm" />
      <div className="flex gap-3">
        <SubmitButton className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">Yes, cancel order</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-600 hover:underline">Keep order</button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
