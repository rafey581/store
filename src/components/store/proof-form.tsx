"use client";
import { useActionState, useState } from "react";
import { submitProofAction } from "@/app/(store)/order/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { inputCls, labelCls } from "@/components/ui/styles";

export function ProofForm({ token, accounts, defaultAmount }: { token: string; accounts: { id: string; label: string }[]; defaultAmount: string }) {
  const [state, action] = useActionState(submitProofAction, null);
  const [v, setV] = useState({ transactionId: "", amount: defaultAmount, payerName: "", accountId: accounts[0]?.id ?? "" });
  const bind = (k: keyof typeof v) => ({ name: k, value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value })) });
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="token" value={token} />
      {accounts.length > 0 && (
        <div className="sm:col-span-2"><label className={labelCls} htmlFor="accountId">Paid to</label>
          <select id="accountId" className={inputCls} {...bind("accountId")}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
        </div>
      )}
      <div><label className={labelCls} htmlFor="transactionId">Transaction ID / reference</label><input id="transactionId" required className={inputCls} {...bind("transactionId")} /></div>
      <div><label className={labelCls} htmlFor="amount">Amount sent (Rs)</label><input id="amount" inputMode="decimal" required className={inputCls} {...bind("amount")} /></div>
      <div className="sm:col-span-2"><label className={labelCls} htmlFor="payerName">Sender name (optional)</label><input id="payerName" className={inputCls} {...bind("payerName")} /></div>
      <div className="sm:col-span-2"><label className={labelCls} htmlFor="screenshot">Payment screenshot</label><input id="screenshot" name="screenshot" type="file" accept="image/jpeg,image/png,image/webp" required className="text-sm" /><p className="mt-1 text-xs text-gray-500">JPG, PNG or WebP, max 5 MB.</p></div>
      <div className="space-y-2 sm:col-span-2"><FormMessage state={state} /><SubmitButton pendingText="Uploading…">Submit payment proof</SubmitButton></div>
    </form>
  );
}
