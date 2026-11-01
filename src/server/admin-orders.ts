import { z } from "zod";
import { db } from "@/server/db";
import { can } from "@/lib/permissions";
import { ADMIN_TRANSITIONS, STOCK_HELD, ownerOnlyTransition } from "@/lib/order-status";
import { addEvent, releaseCoupon, releaseStock } from "@/server/orders";
import { notifyOrder } from "@/server/notify";
import { audit } from "@/server/audit";
import type { OrderStatus } from "@/generated/prisma/enums";

// Shared by the web admin (server action) and the mobile API.

export const statusChangeSchema = z.object({
  orderId: z.string().min(1),
  to: z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
  note: z.string().trim().max(500).optional(),
  courierName: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  trackingUrl: z.string().trim().max(300).optional().refine((v) => !v || /^https?:\/\//.test(v), "Tracking URL must start with http(s)://"),
  notify: z.boolean().default(true),
});
export type StatusChangeInput = z.input<typeof statusChangeSchema>;

export async function changeOrderStatusAs(user: { id: string; role: string }, raw: unknown): Promise<{ ok: string } | { error: string }> {
  if (!can(user.role, "orders")) return { error: "Forbidden" };
  const parsed = statusChangeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
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
  if (d.notify) await notifyOrder(order.id, "status", { status: d.to, note: d.note });
  return { ok: `Order marked ${d.to.toLowerCase()}.` };
}
