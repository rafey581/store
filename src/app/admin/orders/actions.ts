"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { can } from "@/lib/permissions";
import { ADMIN_TRANSITIONS, STOCK_HELD, ownerOnlyTransition } from "@/lib/order-status";
import { addEvent, releaseCoupon, releaseStock } from "@/server/orders";
import { notifyOrder } from "@/server/notify";
import { audit } from "@/server/audit";
import type { ActionState } from "@/components/ui/form-message";
import type { OrderStatus } from "@/generated/prisma/enums";

const schema = z.object({
  orderId: z.string().min(1),
  to: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
  note: z.string().trim().max(500).optional(),
  courierName: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  trackingUrl: z.string().trim().max(300).optional().refine((v) => !v || /^https?:\/\//.test(v), "Tracking URL must start with http(s)://"),
  notify: z.string().optional(),
});

export async function changeOrderStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff("orders");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const order = await db.order.findUnique({ where: { id: d.orderId } });
  if (!order) return { error: "Order not found." };
  const from = order.status;
  if (!ADMIN_TRANSITIONS[from]?.includes(d.to)) return { error: `Cannot change from ${from} to ${d.to}.` };
  if (ownerOnlyTransition(from, d.to) && !can(user.role, "refunds")) return { error: "Only the Owner can cancel paid orders or mark refunds." };
  const courierName = d.courierName || order.courierName;
  const trackingNumber = d.trackingNumber || order.trackingNumber;
  if (d.to === "SHIPPED" && (!courierName || !trackingNumber)) return { error: "Enter the courier and tracking number to mark as shipped." };

  const now = new Date();
  const ok = await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: order.id, status: from },
      data: {
        status: d.to,
        courierName,
        trackingNumber,
        trackingUrl: d.trackingUrl || order.trackingUrl,
        ...(d.to === "SHIPPED" ? { shippedAt: now } : {}),
        ...(d.to === "DELIVERED" ? { deliveredAt: now } : {}),
        ...(d.to === "CANCELLED" ? { cancelledAt: now, expiresAt: null } : {}),
        ...(d.to === "REFUNDED" ? { paymentStatus: "REFUNDED" as const } : {}),
      },
    });
    if (res.count !== 1) return false;
    if ((d.to === "CANCELLED" || d.to === "REFUNDED") && STOCK_HELD.includes(from as OrderStatus)) {
      await releaseStock(tx, order.id, user.id, `Order ${d.to.toLowerCase()} by admin`);
    }
    if (d.to === "CANCELLED" && order.paymentStatus !== "PAID") {
      await releaseCoupon(tx, order.id);
      await tx.payment.updateMany({ where: { orderId: order.id, status: { in: ["INITIATED", "PENDING"] } }, data: { status: "CANCELLED" } });
      await tx.paymentProof.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "REJECTED", rejectionReason: "Order cancelled", reviewedById: user.id, reviewedAt: now } });
    }
    await addEvent(tx, order.id, from, d.to, "ADMIN", user.id, d.note || (d.to === "SHIPPED" ? `${courierName} ${trackingNumber}` : null));
    return true;
  });
  if (!ok) return { error: "The order changed while you were editing. Reload and try again." };
  await audit(user.id, "order.status", "Order", order.id, { from, to: d.to });
  if (d.notify === "on") await notifyOrder(order.id, "status", { status: d.to, note: d.note });
  revalidatePath(`/admin/orders/${order.id}`);
  return { ok: `Order marked ${d.to.toLowerCase()}.` };
}

export async function saveFulfilment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff("orders");
  const parsed = z
    .object({
      orderId: z.string(),
      courierName: z.string().trim().max(60).optional(),
      trackingNumber: z.string().trim().max(80).optional(),
      trackingUrl: z.string().trim().max(300).optional().refine((v) => !v || /^https?:\/\//.test(v), "Tracking URL must start with http(s)://"),
      adminNote: z.string().trim().max(2000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  await db.order.update({ where: { id: d.orderId }, data: { courierName: d.courierName || null, trackingNumber: d.trackingNumber || null, trackingUrl: d.trackingUrl || null, adminNote: d.adminNote || null } });
  await audit(user.id, "order.fulfilment", "Order", d.orderId);
  revalidatePath(`/admin/orders/${d.orderId}`);
  return { ok: "Saved." };
}

export async function approveGatewayPaymentAction(formData: FormData) {
  const user = await requireStaff("refunds"); // Owner only
  const paymentId = String(formData.get("paymentId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  if (note.length < 3) return;
  const { approveGatewayPaymentManually } = await import("@/server/payments");
  const r = await approveGatewayPaymentManually(paymentId, user.id, note);
  await audit(user.id, "payment.manual_approve", "Payment", paymentId, { result: r, note });
  const p = await db.payment.findUnique({ where: { id: paymentId }, select: { orderId: true } });
  if (p) revalidatePath(`/admin/orders/${p.orderId}`);
}
