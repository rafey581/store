"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { changeOrderStatusAs } from "@/server/admin-orders";
import { audit } from "@/server/audit";
import type { ActionState } from "@/components/ui/form-message";

export async function changeOrderStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff("orders");
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const res = await changeOrderStatusAs(user, { ...raw, notify: raw.notify === "on" });
  if ("error" in res) return { error: res.error };
  revalidatePath(`/admin/orders/${raw.orderId}`);
  return { ok: res.ok };
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

export async function markCodCollectedAction(formData: FormData) {
  const user = await requireStaff("orders");
  const orderId = String(formData.get("orderId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  const { markCodCollected } = await import("@/server/payments");
  const r = await markCodCollected(orderId, user.id, note || undefined);
  await audit(user.id, "order.cod_collected", "Order", orderId, { result: r, note });
  revalidatePath(`/admin/orders/${orderId}`);
}
