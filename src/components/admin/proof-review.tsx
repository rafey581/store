"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { reviewProofAction } from "@/app/admin/proofs/actions";
import { FormMessage } from "@/components/ui/form-message";
import { formatPKR } from "@/lib/money";
import { btnPrimary, btnDanger, inputCls } from "@/components/ui/styles";

type Proof = { id: string; status: string; transactionId: string; payerName: string | null; amountClaimedPaisa: number; account: string | null; createdAt: string; rejectionReason: string | null; reviewer: string | null };

export function ProofReview({ proof, orderTotalPaisa, duplicates, orderLink }: { proof: Proof; orderTotalPaisa: number; duplicates: { id: string; number: number }[]; orderLink?: { id: string; number: number } }) {
  const [state, action] = useActionState(reviewProofAction, null);
  const [rejecting, setRejecting] = useState(false);
  const mismatch = proof.amountClaimedPaisa !== orderTotalPaisa;
  const src = `/api/admin/proofs/${proof.id}/screenshot`;
  return (
    <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-[180px_1fr]">
      <a href={src} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Payment screenshot" className="max-h-64 w-full rounded border object-contain" />
        <span className="mt-1 block text-center text-xs text-brand-700">Open full size</span>
      </a>
      <div className="space-y-2 text-sm">
        {orderLink && <p><Link href={`/admin/orders/${orderLink.id}`} className="font-semibold text-brand-700 hover:underline">Order #{orderLink.number}</Link></p>}
        <p>Transaction ID: <span className="font-mono font-semibold">{proof.transactionId}</span></p>
        <p>Amount claimed: <b>{formatPKR(proof.amountClaimedPaisa)}</b> · Order total: <b>{formatPKR(orderTotalPaisa)}</b></p>
        {mismatch && <p className="rounded bg-amber-50 px-2 py-1 text-amber-800">Amount does not match the order total.</p>}
        {duplicates.length > 0 && <p className="rounded bg-red-50 px-2 py-1 text-red-700">This transaction ID was also used on {duplicates.map((d) => `#${d.number}`).join(", ")}.</p>}
        {proof.account && <p>Paid to: {proof.account}</p>}
        {proof.payerName && <p>Sender: {proof.payerName}</p>}
        <p className="text-gray-500">Uploaded {new Date(proof.createdAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</p>
        {proof.status !== "PENDING" ? (
          <p className={proof.status === "APPROVED" ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>
            {proof.status === "APPROVED" ? "Approved" : `Rejected: ${proof.rejectionReason}`}{proof.reviewer ? ` by ${proof.reviewer}` : ""}
          </p>
        ) : state?.ok ? (
          <FormMessage state={state} />
        ) : (
          <form action={action} className="space-y-2 pt-2">
            <input type="hidden" name="proofId" value={proof.id} />
            {rejecting && <input name="reason" required placeholder="Reason shown to the customer" className={inputCls} />}
            <div className="flex flex-wrap gap-2">
              {!rejecting && <button name="decision" value="approve" className={btnPrimary} onClick={(e) => { if (!confirm("Confirm you have verified this payment in your bank/wallet account?")) e.preventDefault(); }}>Approve payment</button>}
              {rejecting ? (
                <>
                  <button name="decision" value="reject" className={btnDanger}>Confirm reject</button>
                  <button type="button" onClick={() => setRejecting(false)} className="text-sm text-gray-600 hover:underline">Cancel</button>
                </>
              ) : (
                <button type="button" onClick={() => setRejecting(true)} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Reject</button>
              )}
            </div>
            <FormMessage state={state} />
          </form>
        )}
      </div>
    </div>
  );
}
