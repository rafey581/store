import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { customerCanCancel, expireDueOrders, methodLabel } from "@/server/orders";
import { CancelOrder } from "@/components/store/cancel-order";
import { availableMethods, reconcilePayment } from "@/server/payments";
import { formatPKR, paisaToRupeeInput } from "@/lib/money";
import { formatDate, orderLabel } from "@/lib/utils";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/order-status";
import { ProofForm } from "@/components/store/proof-form";
import { AutoRedirect } from "@/components/store/auto-redirect";
import { OrderProgress } from "@/components/store/order-progress";
import { ProductPlaceholder } from "@/components/store/product-placeholder";
import { badgeCls, cardCls, btnPrimary } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ placed?: string; payment?: string; error?: string; pay?: string; cancelled?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = await searchParams;
  if (!/^[a-z0-9]{20,40}$/.test(token)) notFound();

  let order = await db.order.findUnique({ where: { trackingToken: token }, select: { id: true, status: true, expiresAt: true } });
  if (!order) notFound();
  if (order.status === "PENDING_PAYMENT" && order.expiresAt && order.expiresAt < new Date()) await expireDueOrders(20);
  if (order.status === "PENDING_PAYMENT") {
    // If a gateway callback was missed, ask the provider directly (server-to-server).
    const pending = await db.payment.findFirst({ where: { orderId: order.id, status: "PENDING", method: { notIn: ["MANUAL_TRANSFER", "COD"] } }, orderBy: { createdAt: "desc" } });
    if (pending) await reconcilePayment(pending.id);
  }

  const o = await db.order.findUniqueOrThrow({
    where: { trackingToken: token },
    include: {
      items: true,
      statusEvents: { where: { isPublic: true }, orderBy: { createdAt: "asc" } },
      proofs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  order = o;
  const [methods, accounts] = o.status === "PENDING_PAYMENT" ? await Promise.all([availableMethods(), db.manualPaymentAccount.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })]) : [[], []];
  const gatewayMethods = methods.filter((m) => m !== "MANUAL_TRANSFER");
  const lastProof = o.proofs[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {sp.pay && o.status === "PENDING_PAYMENT" && gatewayMethods.includes(sp.pay as never) && <AutoRedirect href={`/checkout/pay/${o.trackingToken}?method=${sp.pay}`} label={methodLabel(sp.pay as never)} />}
      {sp.cancelled && o.status === "CANCELLED" && <p className="rounded-xl bg-gray-100 p-4 text-gray-800">Your order has been cancelled. Any reserved items have been released.</p>}
      {sp.placed && !sp.pay && <p className="rounded-2xl border border-brand-100 bg-brand-50 p-5 font-medium text-brand-900">🎉 Thank you! Your order has been placed. Save this page link to track your order. We have also emailed it to you.</p>}
      {sp.payment === "returned" && o.status === "PENDING_PAYMENT" && <p className="rounded-xl bg-amber-50 p-4 text-amber-800">We have not received confirmation of your payment yet. If you completed the payment, this page will update within a few minutes. Otherwise you can try again below.</p>}
      {sp.error && <p className="rounded-xl bg-red-50 p-4 text-red-700">{sp.error.slice(0, 200)}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Order details</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Order {orderLabel(o.number)}</h1>
          <p className="text-sm text-gray-500">Placed {formatDate(o.createdAt)}</p>
        </div>
        <span className={`${badgeCls} px-3 py-1 text-sm ${ORDER_STATUS_COLOR[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
      </div>

      <OrderProgress status={o.status} />

      {o.status === "PENDING_PAYMENT" && (
        <section className={`${cardCls} space-y-5 p-5`}>
          <div>
            <h2 className="text-lg font-semibold">Complete your payment: {formatPKR(o.totalPaisa)}</h2>
            {o.expiresAt && <p className="text-sm text-gray-600">Please pay before {formatDate(o.expiresAt)} or the order will be cancelled automatically.</p>}
            {lastProof?.status === "REJECTED" && <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">Your previous payment proof was not accepted: {lastProof.rejectionReason}. Please upload a new one.</p>}
          </div>
          {gatewayMethods.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {gatewayMethods.map((m) => (
                <a key={m} href={`/checkout/pay/${o.trackingToken}?method=${m}`} className={btnPrimary}>Pay with {methodLabel(m)}</a>
              ))}
            </div>
          )}
          {methods.includes("MANUAL_TRANSFER") && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Pay by bank or wallet transfer</h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {accounts.map((a) => (
                  <li key={a.id} className="rounded-lg border bg-gray-50 p-3 text-sm">
                    <p className="font-semibold">{a.label}</p>
                    <p>Account title: {a.accountTitle}</p>
                    <p>Account no: <span className="font-mono">{a.accountNumber}</span></p>
                    {a.iban && <p>IBAN: <span className="font-mono">{a.iban}</span></p>}
                    {a.instructions && <p className="mt-1 text-gray-600">{a.instructions}</p>}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-gray-700">Use <b>{orderLabel(o.number)}</b> as the payment reference. After paying, upload the screenshot below.</p>
              <ProofForm token={o.trackingToken} accounts={accounts.map((a) => ({ id: a.id, label: `${a.label} – ${a.accountNumber}` }))} defaultAmount={paisaToRupeeInput(o.totalPaisa)} />
            </div>
          )}
          {methods.length === 0 && <p className="text-sm text-gray-600">Online payment is temporarily unavailable. Please contact us.</p>}
        </section>
      )}

      {o.paymentMethod === "COD" && o.paymentStatus !== "PAID" && ["PROCESSING", "SHIPPED"].includes(o.status) && (
        <p className={`${cardCls} border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900`}>Your order is confirmed. Please keep <b>{formatPKR(o.totalPaisa)}</b> ready to pay in cash when the courier delivers it.</p>
      )}
      {o.status === "PAYMENT_REVIEW" && <p className={`${cardCls} p-5 text-sm`}>We received your payment proof (transaction {lastProof?.transactionId}). Our team is verifying it, usually within a few hours during business days.</p>}

      {(o.trackingNumber || o.courierName) && (
        <section className={`${cardCls} p-5 text-sm`}>
          <h2 className="mb-2 font-semibold">Shipment</h2>
          <p>Courier: {o.courierName ?? "—"}</p>
          <p>Tracking number: <span className="font-mono">{o.trackingNumber ?? "—"}</span></p>
          {o.trackingUrl && <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-medium text-brand-700 hover:underline">Track with courier →</a>}
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <section className={`${cardCls} p-5 md:col-span-2`}>
          <h2 className="mb-3 font-semibold">Items</h2>
          <ul className="divide-y">
            {o.items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sand-100">{it.imageUrl ? <Image src={it.imageUrl} alt="" fill sizes="56px" className="object-cover" /> : <ProductPlaceholder name={it.productName} className="[&_span]:text-lg" />}</span>
                <span className="flex-1">{it.productName}{it.variantTitle !== "Default" && <span className="text-gray-500"> ({it.variantTitle})</span>} × {it.quantity}</span>
                <span>{formatPKR(it.lineTotalPaisa)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPKR(o.subtotalPaisa)}</dd></div>
            {o.discountPaisa > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount {o.couponCode && `(${o.couponCode})`}</dt><dd>-{formatPKR(o.discountPaisa)}</dd></div>}
            <div className="flex justify-between"><dt>Shipping</dt><dd>{o.shippingPaisa ? formatPKR(o.shippingPaisa) : "Free"}</dd></div>
            {o.codFeePaisa > 0 && <div className="flex justify-between"><dt>Cash on delivery fee</dt><dd>{formatPKR(o.codFeePaisa)}</dd></div>}
            <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatPKR(o.totalPaisa)}</dd></div>
          </dl>
        </section>
        <section className={`${cardCls} space-y-4 p-5 text-sm`}>
          <div>
            <h2 className="mb-1 font-semibold">Delivery</h2>
            <p>{o.customerName}</p>
            <p>{o.shipLine1}</p>
            {o.shipLine2 && <p>{o.shipLine2}</p>}
            <p>{o.shipCity}{o.shipProvince ? `, ${o.shipProvince}` : ""}</p>
            <p>{o.phone}</p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold">Payment</h2>
            <p>{methodLabel(o.paymentMethod)}</p>
          </div>
        </section>
      </div>

      <section className={`${cardCls} p-5`}>
        <h2 className="mb-3 font-semibold">Order history</h2>
        <ol className="space-y-3 border-l-2 border-gray-200 pl-4 text-sm">
          {o.statusEvents.map((e) => (
            <li key={e.id}>
              <p className="font-medium">{ORDER_STATUS_LABEL[e.toStatus]}</p>
              <p className="text-gray-500">{formatDate(e.createdAt)}{e.note ? ` · ${e.note}` : ""}</p>
            </li>
          ))}
        </ol>
      </section>
      {customerCanCancel(o) && <div className="text-center"><CancelOrder token={o.trackingToken} /></div>}
      <p className="text-center text-sm"><Link href="/" className="text-brand-700 hover:underline">Continue shopping</Link></p>
    </div>
  );
}
