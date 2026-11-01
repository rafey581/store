import { db } from "@/server/db";
import { getSettings } from "@/server/settings";
import { sendEmail } from "@/server/email/send";
import * as T from "@/server/email/templates";
import { pushToStaff } from "@/server/push";
import { formatPKR } from "@/lib/money";
import { siteUrl, orderLabel } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatus } from "@/generated/prisma/enums";

async function load(orderId: string) {
  return db.order.findUnique({ where: { id: orderId }, include: { items: true } });
}

type Kind = "placed" | "proof_received" | "paid" | "proof_rejected" | "status";

/** Customer email + staff push for order events. Never throws. */
export async function notifyOrder(orderId: string, kind: Kind, extra?: { reason?: string; status?: OrderStatus; note?: string | null }) {
  try {
    const [o, s] = await Promise.all([load(orderId), getSettings()]);
    if (!o) return;
    let mail: { subject: string; html: string } | null = null;
    switch (kind) {
      case "placed":
        mail = T.orderPlacedEmail(s.storeName, o);
        if (s.orderEmailBcc) {
          const a = T.adminNewOrderEmail(s.storeName, o, siteUrl(`/admin/orders/${o.id}`));
          await sendEmail({ to: s.orderEmailBcc, template: "admin_new_order", orderId: o.id, ...a });
        }
        await pushToStaff("order", `New order ${orderLabel(o.number)}`, `${o.customerName} · ${formatPKR(o.totalPaisa)} · ${o.shipCity}`, { orderId: o.id, type: "order" });
        break;
      case "proof_received":
        mail = T.proofReceivedEmail(s.storeName, o);
        await pushToStaff("proof", `Payment proof for ${orderLabel(o.number)}`, `${o.customerName} uploaded a transfer proof (${formatPKR(o.totalPaisa)})`, { orderId: o.id, type: "proof" });
        break;
      case "paid":
        mail = T.paymentConfirmedEmail(s.storeName, o);
        if (o.paymentMethod !== "MANUAL_TRANSFER") await pushToStaff("order", `Payment received ${orderLabel(o.number)}`, `${formatPKR(o.totalPaisa)} via ${o.paymentMethod}`, { orderId: o.id, type: "order" });
        break;
      case "proof_rejected":
        mail = T.proofRejectedEmail(s.storeName, o, extra?.reason ?? "");
        break;
      case "status":
        if (extra?.status === "SHIPPED") mail = T.orderShippedEmail(s.storeName, o);
        else if (extra?.status) mail = T.orderStatusEmail(s.storeName, o, ORDER_STATUS_LABEL[extra.status], extra.note);
        break;
    }
    if (mail) await sendEmail({ to: o.email, template: kind === "status" ? `status_${extra?.status?.toLowerCase()}` : kind, orderId: o.id, ...mail });
  } catch (e) {
    console.error("notifyOrder failed", e);
  }
}
