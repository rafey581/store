import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { ProofReview } from "@/components/admin/proof-review";

export const metadata = { title: "Payment proofs" };

function minutesAgo(m: number) {
  return new Date(Date.now() - m * 60_000);
}

export default async function ProofsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff("proofs");
  const sp = await searchParams;
  const status = sp.status === "APPROVED" || sp.status === "REJECTED" ? sp.status : "PENDING";
  // Pending view also keeps proofs reviewed in the last 30 minutes so the reviewer sees the result.
  const where: Prisma.PaymentProofWhereInput = status === "PENDING" ? { OR: [{ status: "PENDING" as const }, { reviewedAt: { gte: minutesAgo(30) } }] } : { status };
  const proofs = await db.paymentProof.findMany({ where, orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" }, take: 50, include: { order: { select: { id: true, number: true, totalPaisa: true } }, account: true, reviewedBy: { select: { name: true, email: true } } } });
  const txnIds = proofs.map((p) => p.transactionId);
  const all = txnIds.length ? await db.paymentProof.findMany({ where: { transactionId: { in: txnIds } }, select: { transactionId: true, orderId: true, order: { select: { number: true } } } }) : [];
  return (
    <div>
      <PageHeader title="Payment proofs" description="Check each transfer in your bank or wallet app before approving." />
      <div className="mb-4 flex gap-2 text-sm">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <Link key={s} href={`/admin/proofs?status=${s}`} className={`rounded-full px-3 py-1 ${status === s ? "bg-brand-600 text-white" : "border bg-white"}`}>{s.toLowerCase()}</Link>
        ))}
      </div>
      <div className="space-y-4">
        {proofs.filter((p) => p.status === status).length === 0 && <p className="rounded-xl border bg-white p-6 text-center text-gray-500">No {status.toLowerCase()} proofs.</p>}
        {proofs.map((p) => (
          <div key={p.id} className="rounded-xl bg-white">
            <ProofReview
              proof={{ id: p.id, status: p.status, transactionId: p.transactionId, payerName: p.payerName, amountClaimedPaisa: p.amountClaimedPaisa, account: p.account ? `${p.account.label} – ${p.account.accountNumber}` : null, createdAt: p.createdAt.toISOString(), rejectionReason: p.rejectionReason, reviewer: p.reviewedBy?.name || p.reviewedBy?.email || null }}
              orderTotalPaisa={p.order.totalPaisa}
              orderLink={{ id: p.order.id, number: p.order.number }}
              duplicates={all.filter((x) => x.transactionId === p.transactionId && x.orderId !== p.orderId).map((x) => ({ id: x.orderId, number: x.order.number }))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
