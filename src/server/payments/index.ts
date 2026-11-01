// The payment module. This is the ONLY code that sets an order to PAID:
//   - markOrderPaid() is called from handleGatewayCallback() after a provider
//     callback has been verified server-side and the amount matches, or
//   - from approveProof() when an admin approves a manual transfer proof.
// Browser return pages only read the order status.

import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { getSettings, type Settings } from "@/server/settings";
import { addEvent, reReserveStock } from "@/server/orders";
import { notifyOrder } from "@/server/notify";
import { karachiDay, siteUrl } from "@/lib/utils";
import { putObject, readImageFile } from "@/server/storage";
import { providers } from "@/server/payments/providers";
import type { GatewayProvider, InitiateResult, VerifiedCallback } from "@/server/payments/types";
import type { Prisma } from "@/generated/prisma/client";
import type { ActorType, PaymentMethod } from "@/generated/prisma/enums";
import { Prisma as P } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Available methods
// ---------------------------------------------------------------------------

const TOGGLE: Record<PaymentMethod, keyof Settings> = {
  SAFEPAY: "enableSafepay",
  PAYFAST: "enablePayfast",
  JAZZCASH: "enableJazzcash",
  EASYPAISA: "enableEasypaisa",
  MANUAL_TRANSFER: "enableManualTransfer",
};

export function getProvider(method: PaymentMethod): GatewayProvider | null {
  if (method === "MANUAL_TRANSFER") return null;
  return providers[method] ?? null;
}

export function isGatewayConfigured(method: PaymentMethod): boolean {
  if (method === "MANUAL_TRANSFER") return true;
  return getProvider(method)?.isConfigured() ?? false;
}

export async function availableMethods(): Promise<PaymentMethod[]> {
  const s = await getSettings();
  const order: PaymentMethod[] = ["SAFEPAY", "PAYFAST", "JAZZCASH", "EASYPAISA", "MANUAL_TRANSFER"];
  return order.filter((m) => Boolean(s[TOGGLE[m]]) && isGatewayConfigured(m));
}

// ---------------------------------------------------------------------------
// markOrderPaid — single source of truth for PAID
// ---------------------------------------------------------------------------

export type MarkPaidResult = "paid" | "already_paid" | "not_found";

export async function markOrderPaid(tx: Tx, args: { orderId: string; paymentId: string; actorType: ActorType; actorId: string | null; note: string; providerTxnId?: string | null }): Promise<MarkPaidResult> {
  // Lock the order row so concurrent callbacks/approvals are serialized.
  const locked = await tx.$queryRaw<{ id: string; status: string; paymentStatus: string; totalPaisa: number }[]>`
    SELECT "id", "status"::text, "paymentStatus"::text, "totalPaisa" FROM "Order" WHERE "id" = ${args.orderId} FOR UPDATE`;
  const order = locked[0];
  if (!order) return "not_found";
  const now = new Date();

  await tx.payment.update({ where: { id: args.paymentId }, data: { status: "SUCCEEDED", paidAt: now, ...(args.providerTxnId ? { providerTxnId: args.providerTxnId } : {}) } });

  if (order.paymentStatus === "PAID") {
    // A second successful payment for an already-paid order: record it for a refund.
    await addEvent(tx, args.orderId, order.status as never, order.status as never, args.actorType, args.actorId, `Additional payment received (${args.note}). Review for refund.`, false);
    return "already_paid";
  }

  let note = args.note;
  if (order.status === "EXPIRED" || order.status === "CANCELLED") {
    const ok = await reReserveStock(tx, args.orderId);
    note += ok ? " (paid after expiry; items re-reserved)" : " (paid after expiry; some items are out of stock — contact customer or refund)";
  }
  await tx.order.update({ where: { id: args.orderId }, data: { status: "PAID", paymentStatus: "PAID", paidAt: now, expiresAt: null, cancelledAt: null } });
  await addEvent(tx, args.orderId, order.status as never, "PAID", args.actorType, args.actorId, note);
  const day = karachiDay(now);
  await tx.dailyStat.upsert({ where: { date: day }, update: { revenuePaisa: { increment: order.totalPaisa } }, create: { date: day, revenuePaisa: order.totalPaisa } });
  return "paid";
}

// ---------------------------------------------------------------------------
// Gateways
// ---------------------------------------------------------------------------

export class PaymentError extends Error {}

/** Creates a new payment attempt for an unpaid order and asks the provider for a hosted checkout. */
export async function initiateGatewayPayment(orderToken: string, method: PaymentMethod): Promise<InitiateResult> {
  const provider = getProvider(method);
  if (!provider || !provider.isConfigured()) throw new PaymentError("This payment method is not available.");
  if (!(await availableMethods()).includes(method)) throw new PaymentError("This payment method is turned off.");
  const order = await db.order.findUnique({ where: { trackingToken: orderToken } });
  if (!order) throw new PaymentError("Order not found.");
  if (order.status !== "PENDING_PAYMENT" || order.paymentStatus === "PAID") throw new PaymentError("This order cannot be paid right now.");
  if (order.expiresAt && order.expiresAt < new Date()) throw new PaymentError("This order has expired. Please place a new order.");

  const reference = `${order.number}${randomBytes(4).toString("hex").toUpperCase()}`;
  const payment = await db.payment.create({ data: { orderId: order.id, method, status: "INITIATED", amountPaisa: order.totalPaisa, reference } });
  if (order.paymentMethod !== method) await db.order.update({ where: { id: order.id }, data: { paymentMethod: method } });

  try {
    const result = await provider.initiate({
      order: { id: order.id, number: order.number, email: order.email, phone: order.phone, customerName: order.customerName, totalPaisa: order.totalPaisa, trackingToken: order.trackingToken },
      payment: { id: payment.id, reference, amountPaisa: payment.amountPaisa },
      returnUrl: siteUrl(`/api/payments/${method.toLowerCase()}/return?ref=${reference}`),
      callbackUrl: siteUrl(`/api/payments/${method.toLowerCase()}/callback`),
    });
    await db.payment.update({ where: { id: payment.id }, data: { status: "PENDING", initPayload: (result.providerData ?? {}) as Prisma.InputJsonValue } });
    return result;
  } catch (e) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: String(e).slice(0, 500) } });
    console.error(`[payments] ${method} initiate failed`, e);
    throw new PaymentError("Could not start the payment. Please try again or choose another method.");
  }
}

export type CallbackOutcome = "applied" | "duplicate" | "invalid_signature" | "unknown_reference" | "amount_mismatch" | "failed_recorded" | "pending" | "already_paid";

/** Applies a verified callback exactly once. */
export async function handleGatewayCallback(method: PaymentMethod, v: VerifiedCallback): Promise<CallbackOutcome> {
  // 1. Log the event. The unique (method, eventKey) makes replays no-ops.
  let eventId: string;
  try {
    const ev = await db.paymentEvent.create({ data: { method, eventKey: v.eventKey.slice(0, 300), signatureValid: v.signatureValid, payload: (v.payload ?? {}) as Prisma.InputJsonValue } });
    eventId = ev.id;
  } catch (e) {
    if (e instanceof P.PrismaClientKnownRequestError && e.code === "P2002") return "duplicate";
    throw e;
  }
  const finish = async (result: CallbackOutcome, paymentId?: string) => {
    await db.paymentEvent.update({ where: { id: eventId }, data: { result, processedAt: new Date(), paymentId: paymentId ?? null } });
    return result;
  };

  if (!v.signatureValid) return finish("invalid_signature");
  if (!v.reference) return finish("unknown_reference");
  const payment = await db.payment.findUnique({ where: { reference: v.reference } });
  if (!payment || payment.method !== method) return finish("unknown_reference");

  if (v.status === "PENDING") return finish("pending", payment.id);

  if (v.status === "FAILED") {
    if (payment.status !== "SUCCEEDED") {
      await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: v.message?.slice(0, 500) ?? "Declined", providerTxnId: v.providerTxnId ?? payment.providerTxnId } });
    }
    return finish("failed_recorded", payment.id);
  }

  // SUCCEEDED: the amount must match what the server computed.
  if (v.amountPaisa === null || v.amountPaisa !== payment.amountPaisa) {
    await db.payment.update({ where: { id: payment.id }, data: { failureReason: `Amount mismatch: expected ${payment.amountPaisa}, got ${v.amountPaisa}` } });
    return finish("amount_mismatch", payment.id);
  }
  if (payment.status === "SUCCEEDED") return finish("duplicate", payment.id);

  const result = await db.$transaction((tx) =>
    markOrderPaid(tx, { orderId: payment.orderId, paymentId: payment.id, actorType: "GATEWAY", actorId: null, note: `Paid via ${method}${v.providerTxnId ? ` (txn ${v.providerTxnId})` : ""}`, providerTxnId: v.providerTxnId }),
  );
  if (result === "paid") await notifyOrder(payment.orderId, "paid");
  return finish(result === "paid" ? "applied" : result === "already_paid" ? "already_paid" : "unknown_reference", payment.id);
}

/** For pages and cron: ask the provider directly about a pending attempt (if supported). */
export async function reconcilePayment(paymentId: string): Promise<CallbackOutcome | null> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === "SUCCEEDED") return null;
  const provider = getProvider(payment.method);
  if (!provider?.queryStatus || !provider.isConfigured()) return null;
  const v = await provider.queryStatus(payment.reference, payment).catch((e) => {
    console.error("[payments] queryStatus failed", e);
    return null;
  });
  if (!v) return null;
  return handleGatewayCallback(payment.method, v);
}

// ---------------------------------------------------------------------------
// Manual transfer proofs
// ---------------------------------------------------------------------------

export async function submitProof(args: { orderToken: string; file: File; transactionId: string; amountClaimedPaisa: number; payerName: string | null; accountId: string | null }) {
  const order = await db.order.findUnique({ where: { trackingToken: args.orderToken }, include: { payments: { where: { method: "MANUAL_TRANSFER" }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!order) throw new PaymentError("Order not found.");
  if (order.status !== "PENDING_PAYMENT") throw new PaymentError("This order is not waiting for payment.");
  if (order.expiresAt && order.expiresAt < new Date()) throw new PaymentError("This order has expired. Please place a new order.");
  if (args.accountId && !(await db.manualPaymentAccount.findFirst({ where: { id: args.accountId, isActive: true } }))) throw new PaymentError("Unknown account.");

  const img = await readImageFile(args.file);
  const { key } = await putObject("private", "proofs", img.buffer, img.contentType, img.ext);

  await db.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({ where: { id: order.id, status: "PENDING_PAYMENT" }, data: { status: "PAYMENT_REVIEW", paymentStatus: "PENDING_VERIFICATION", paymentMethod: "MANUAL_TRANSFER" } });
    if (moved.count !== 1) throw new PaymentError("This order is not waiting for payment.");
    let paymentId = order.payments[0]?.id;
    if (!paymentId) {
      paymentId = (await tx.payment.create({ data: { orderId: order.id, method: "MANUAL_TRANSFER", status: "PENDING", amountPaisa: order.totalPaisa, reference: `M${order.number}-${Date.now().toString(36)}` } })).id;
    }
    await tx.paymentProof.create({ data: { orderId: order.id, paymentId, accountId: args.accountId, transactionId: args.transactionId, payerName: args.payerName, amountClaimedPaisa: args.amountClaimedPaisa, screenshotKey: key } });
    await addEvent(tx, order.id, "PENDING_PAYMENT", "PAYMENT_REVIEW", "CUSTOMER", order.userId, "Payment proof uploaded");
  });
  await notifyOrder(order.id, "proof_received");
}

export async function approveProof(proofId: string, adminId: string): Promise<"approved" | "already_reviewed" | "not_found"> {
  const proof = await db.paymentProof.findUnique({ where: { id: proofId } });
  if (!proof) return "not_found";
  const outcome = await db.$transaction(async (tx) => {
    const res = await tx.paymentProof.updateMany({ where: { id: proofId, status: "PENDING" }, data: { status: "APPROVED", reviewedById: adminId, reviewedAt: new Date() } });
    if (res.count !== 1) return "already_reviewed" as const;
    let paymentId = proof.paymentId;
    if (!paymentId) {
      const order = await tx.order.findUniqueOrThrow({ where: { id: proof.orderId } });
      paymentId = (await tx.payment.create({ data: { orderId: order.id, method: "MANUAL_TRANSFER", status: "PENDING", amountPaisa: order.totalPaisa, reference: `M${order.number}-${Date.now().toString(36)}` } })).id;
    }
    await markOrderPaid(tx, { orderId: proof.orderId, paymentId, actorType: "ADMIN", actorId: adminId, note: `Bank/wallet transfer approved (txn ${proof.transactionId})`, providerTxnId: null });
    return "approved" as const;
  });
  if (outcome === "approved") await notifyOrder(proof.orderId, "paid");
  return outcome;
}

export async function rejectProof(proofId: string, adminId: string, reason: string): Promise<"rejected" | "already_reviewed" | "not_found"> {
  const settings = await getSettings();
  const proof = await db.paymentProof.findUnique({ where: { id: proofId } });
  if (!proof) return "not_found";
  const outcome = await db.$transaction(async (tx) => {
    const res = await tx.paymentProof.updateMany({ where: { id: proofId, status: "PENDING" }, data: { status: "REJECTED", reviewedById: adminId, reviewedAt: new Date(), rejectionReason: reason } });
    if (res.count !== 1) return "already_reviewed" as const;
    const otherPending = await tx.paymentProof.count({ where: { orderId: proof.orderId, status: "PENDING" } });
    if (otherPending === 0) {
      const moved = await tx.order.updateMany({
        where: { id: proof.orderId, status: "PAYMENT_REVIEW" },
        data: { status: "PENDING_PAYMENT", paymentStatus: "UNPAID", expiresAt: new Date(Date.now() + settings.manualOrderExpiryHours * 3600_000) },
      });
      if (moved.count === 1) await addEvent(tx, proof.orderId, "PAYMENT_REVIEW", "PENDING_PAYMENT", "ADMIN", adminId, `Payment proof rejected: ${reason}`);
    }
    return "rejected" as const;
  });
  if (outcome === "rejected") await notifyOrder(proof.orderId, "proof_rejected", { reason });
  return outcome;
}
