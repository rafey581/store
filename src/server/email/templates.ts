import { formatPKR } from "@/lib/money";
import { siteUrl, orderLabel } from "@/lib/utils";

const esc = (s: string | null | undefined) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(storeName: string, title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:12px;padding:24px">
<p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#047857">${esc(storeName)}</p>
<h1 style="margin:0 0 16px;font-size:20px">${esc(title)}</h1>
${body}
</div>
<p style="text-align:center;color:#888;font-size:12px;margin-top:16px">${esc(storeName)} · Pakistan</p>
</div></body></html>`;
}

const button = (href: string, text: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#059669;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${esc(text)}</a></p>`;

export type EmailOrder = {
  number: number;
  trackingToken: string;
  customerName: string;
  totalPaisa: number;
  subtotalPaisa: number;
  discountPaisa: number;
  shippingPaisa: number;
  codFeePaisa?: number;
  paymentMethod: string;
  items: { productName: string; variantTitle: string; quantity: number; lineTotalPaisa: number }[];
  shipLine1: string;
  shipLine2?: string | null;
  shipCity: string;
  phone: string;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};

function itemsTable(o: EmailOrder) {
  const rows = o.items
    .map((i) => `<tr><td style="padding:6px 0">${esc(i.productName)}${i.variantTitle !== "Default" ? ` <span style="color:#666">(${esc(i.variantTitle)})</span>` : ""} × ${i.quantity}</td><td style="text-align:right">${formatPKR(i.lineTotalPaisa)}</td></tr>`)
    .join("");
  const line = (l: string, v: string, bold = false) => `<tr><td style="padding:4px 0;${bold ? "font-weight:bold" : "color:#555"}">${l}</td><td style="text-align:right;${bold ? "font-weight:bold" : ""}">${v}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
<tr><td colspan="2"><hr style="border:none;border-top:1px solid #eee"></td></tr>
${line("Subtotal", formatPKR(o.subtotalPaisa))}
${o.discountPaisa ? line("Discount", "-" + formatPKR(o.discountPaisa)) : ""}
${line("Shipping", o.shippingPaisa ? formatPKR(o.shippingPaisa) : "Free")}
${o.codFeePaisa ? line("Cash on delivery fee", formatPKR(o.codFeePaisa)) : ""}
${line("Total", formatPKR(o.totalPaisa), true)}</table>`;
}

const orderLink = (o: EmailOrder) => siteUrl(`/order/${o.trackingToken}`);

export function orderPlacedEmail(store: string, o: EmailOrder) {
  const pay =
    o.paymentMethod === "COD"
      ? `<p>Your order is confirmed. Please pay <b>${formatPKR(o.totalPaisa)}</b> in cash to the courier on delivery.</p>`
      : o.paymentMethod === "MANUAL_TRANSFER"
      ? `<p>Please transfer <b>${formatPKR(o.totalPaisa)}</b> to one of our accounts shown on your order page, then upload the payment screenshot and transaction ID there. Your order will be confirmed after we verify the payment.</p>`
      : `<p>If you have not completed payment yet, you can do so from your order page.</p>`;
  return {
    subject: `Order ${orderLabel(o.number)} received`,
    html: layout(store, `Thank you, ${o.customerName}!`, `<p>We have received your order ${orderLabel(o.number)}.</p>${pay}${button(orderLink(o), "View your order")}${itemsTable(o)}
<p style="font-size:14px;color:#555;margin-top:16px">Delivery to: ${esc(o.shipLine1)}${o.shipLine2 ? ", " + esc(o.shipLine2) : ""}, ${esc(o.shipCity)} · ${esc(o.phone)}</p>`),
  };
}

export function proofReceivedEmail(store: string, o: EmailOrder) {
  return { subject: `Payment proof received for ${orderLabel(o.number)}`, html: layout(store, "We received your payment proof", `<p>Thanks! We are verifying your payment for order ${orderLabel(o.number)}. You will get an email once it is confirmed.</p>${button(orderLink(o), "View order")}`) };
}

export function paymentConfirmedEmail(store: string, o: EmailOrder) {
  return { subject: `Payment confirmed for ${orderLabel(o.number)}`, html: layout(store, "Payment confirmed", `<p>Your payment of <b>${formatPKR(o.totalPaisa)}</b> for order ${orderLabel(o.number)} has been confirmed. We are preparing your order.</p>${button(orderLink(o), "Track your order")}${itemsTable(o)}`) };
}

export function proofRejectedEmail(store: string, o: EmailOrder, reason: string) {
  return { subject: `Action needed: payment for ${orderLabel(o.number)}`, html: layout(store, "We could not verify your payment", `<p>Reason: ${esc(reason)}</p><p>Please check the details and upload a new payment proof from your order page.</p>${button(orderLink(o), "Upload new proof")}`) };
}

export function orderShippedEmail(store: string, o: EmailOrder) {
  const t = o.trackingNumber ? `<p>Courier: <b>${esc(o.courierName || "")}</b><br>Tracking number: <b>${esc(o.trackingNumber)}</b></p>${o.trackingUrl ? button(o.trackingUrl, "Track with courier") : ""}` : "";
  return { subject: `Order ${orderLabel(o.number)} has shipped`, html: layout(store, "Your order is on the way", `<p>Good news! Order ${orderLabel(o.number)} has been shipped.</p>${t}${button(orderLink(o), "View order")}`) };
}

export function orderStatusEmail(store: string, o: EmailOrder, statusText: string, note?: string | null) {
  return { subject: `Order ${orderLabel(o.number)}: ${statusText}`, html: layout(store, `Order ${statusText.toLowerCase()}`, `<p>Your order ${orderLabel(o.number)} is now: <b>${esc(statusText)}</b>.</p>${note ? `<p>${esc(note)}</p>` : ""}${button(orderLink(o), "View order")}`) };
}

export function adminNewOrderEmail(store: string, o: EmailOrder, adminUrl: string) {
  return { subject: `New order ${orderLabel(o.number)} – ${formatPKR(o.totalPaisa)}`, html: layout(store, `New order ${orderLabel(o.number)}`, `<p>${esc(o.customerName)} · ${esc(o.shipCity)} · ${esc(o.paymentMethod)}</p>${itemsTable(o)}${button(adminUrl, "Open in admin")}`) };
}

export function passwordResetEmail(store: string, link: string) {
  return { subject: "Reset your password", html: layout(store, "Reset your password", `<p>Click the button below to choose a new password. This link expires in 1 hour. If you did not ask for this, ignore this email.</p>${button(link, "Reset password")}`) };
}
