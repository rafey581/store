import { db } from "@/server/db";
import { requireMobileStaff, json } from "@/server/mobile-api";
import type { ProofStatus } from "@/generated/prisma/enums";

export async function GET(req: Request) {
  const u = await requireMobileStaff(req, "proofs");
  if (u instanceof Response) return u;
  const status = new URL(req.url).searchParams.get("status");
  const proofStatus: ProofStatus = status === "APPROVED" || status === "REJECTED" ? status : "PENDING";
  const where = { status: proofStatus };
  const proofs = await db.paymentProof.findMany({
    where,
    orderBy: { createdAt: proofStatus === "PENDING" ? "asc" : "desc" },
    take: 50,
    include: { order: { select: { id: true, number: true, totalPaisa: true, customerName: true } }, account: { select: { label: true, accountNumber: true } } },
  });
  const txnIds = proofs.map((p) => p.transactionId);
  const dups = txnIds.length ? await db.paymentProof.findMany({ where: { transactionId: { in: txnIds } }, select: { transactionId: true, orderId: true } }) : [];
  return json({
    items: proofs.map((p) => ({
      id: p.id,
      status: p.status,
      transactionId: p.transactionId,
      payerName: p.payerName,
      amountClaimedPaisa: p.amountClaimedPaisa,
      account: p.account ? `${p.account.label} – ${p.account.accountNumber}` : null,
      rejectionReason: p.rejectionReason,
      createdAt: p.createdAt,
      screenshotUrl: `/api/admin/proofs/${p.id}/screenshot`,
      order: p.order,
      amountMismatch: p.amountClaimedPaisa !== p.order.totalPaisa,
      duplicateTxnId: dups.some((d) => d.transactionId === p.transactionId && d.orderId !== p.orderId),
    })),
  });
}
