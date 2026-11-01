import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { can } from "@/lib/permissions";
import { methodLabel } from "@/server/orders";
import { PageHeader } from "@/components/admin/page-header";
import { StatusForm, FulfilmentForm } from "@/components/admin/order-forms";
import { approveGatewayPaymentAction, markCodCollectedAction } from "../actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ProofReview } from "@/components/admin/proof-review";
import { formatPKR } from "@/lib/money";
import { formatDate, orderLabel } from "@/lib/utils";
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, allowedTransitions } from "@/lib/order-status";
import { badgeCls, cardCls } from "@/components/ui/styles";

export const metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff("orders");
  const { id } = await params;
  const o = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      user: { select: { id: true, email: true } },
      statusEvents: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true, email: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      proofs: { orderBy: { createdAt: "desc" }, include: { account: true, reviewedBy: { select: { name: true, email: true } } } },
      emails: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!o) notFound();
  const canVerify = can(user.role, "refunds");
  const options = allowedTransitions(o, can(user.role, "refunds"));
  const txnIds = o.proofs.map((p) => p.transactionId);
  const duplicates = txnIds.length ? await db.paymentProof.findMany({ where: { transactionId: { in: txnIds }, orderId: { not: o.id } }, select: { transactionId: true, order: { select: { id: true, number: true } } } }) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order ${orderLabel(o.number)}`}
        description={`Placed ${formatDate(o.createdAt)} · ${methodLabel(o.paymentMethod)}`}
        actions={<><span className={`${badgeCls} px-3 py-1 text-sm ${ORDER_STATUS_COLOR[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span><span className={`${badgeCls} px-3 py-1 text-sm ${o.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>{o.paymentStatus === "PAID" ? "Paid" : o.paymentStatus === "REFUNDED" ? "Refunded" : "Unpaid"}</span><Link href={`/print/orders/${o.id}`} target="_blank" className="text-sm text-brand-700 hover:underline">Print invoice</Link><Link href={`/order/${o.trackingToken}`} target="_blank" className="text-sm text-brand-700 hover:underline">Customer view</Link></>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {o.proofs.length > 0 && (
            <section className={`${cardCls} p-5`}>
              <h2 className="mb-3 font-semibold">Payment proofs</h2>
              <div className="space-y-4">
                {o.proofs.map((p) => (
                  <ProofReview key={p.id} proof={{ id: p.id, status: p.status, transactionId: p.transactionId, payerName: p.payerName, amountClaimedPaisa: p.amountClaimedPaisa, account: p.account ? `${p.account.label} – ${p.account.accountNumber}` : null, createdAt: p.createdAt.toISOString(), rejectionReason: p.rejectionReason, reviewer: p.reviewedBy?.name || p.reviewedBy?.email || null }} orderTotalPaisa={o.totalPaisa} duplicates={duplicates.filter((d) => d.transactionId === p.transactionId).map((d) => ({ id: d.order.id, number: d.order.number }))} />
                ))}
              </div>
            </section>
          )}
          <section className={`${cardCls} p-5`}>
            <h2 className="mb-3 font-semibold">Items</h2>
            <table className="w-full text-sm">
              <tbody>
                {o.items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="py-2">{it.productName}{it.variantTitle !== "Default" && <span className="text-gray-500"> ({it.variantTitle})</span>}<div className="text-xs text-gray-400">SKU {it.sku}</div></td>
                    <td className="text-right">{formatPKR(it.unitPricePaisa)} × {it.quantity}</td>
                    <td className="text-right font-medium">{formatPKR(it.lineTotalPaisa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="ml-auto mt-3 max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPKR(o.subtotalPaisa)}</dd></div>
              {o.discountPaisa > 0 && <div className="flex justify-between"><dt>Discount ({o.couponCode})</dt><dd>-{formatPKR(o.discountPaisa)}</dd></div>}
              <div className="flex justify-between"><dt>Shipping</dt><dd>{formatPKR(o.shippingPaisa)}</dd></div>
              {o.codFeePaisa > 0 && <div className="flex justify-between"><dt>COD fee</dt><dd>{formatPKR(o.codFeePaisa)}</dd></div>}
              <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatPKR(o.totalPaisa)}</dd></div>
            </dl>
          </section>
          <section className={`${cardCls} p-5`}>
            <h2 className="mb-3 font-semibold">Payment attempts</h2>
            {o.payments.length === 0 ? <p className="text-sm text-gray-500">None.</p> : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-gray-500"><tr><th>Method</th><th>Reference</th><th>Status</th><th>Amount</th><th>Date</th></tr></thead>
                <tbody>{o.payments.map((p) => (
                  <tr key={p.id} className="border-t"><td className="py-2">{methodLabel(p.method)}</td><td className="font-mono text-xs">{p.reference}{p.providerTxnId && <div className="text-gray-400">{p.providerTxnId}</div>}</td><td>{p.status}{p.failureReason && <div className="text-xs text-red-600">{p.failureReason}</div>}
                    {canVerify && p.method !== "MANUAL_TRANSFER" && p.status !== "SUCCEEDED" && o.paymentStatus !== "PAID" && (
                      <details className="mt-1 text-xs"><summary className="cursor-pointer text-brand-700">Verify manually</summary>
                        <form action={approveGatewayPaymentAction} className="mt-1 space-y-1">
                          <input type="hidden" name="paymentId" value={p.id} />
                          <input name="note" required minLength={3} placeholder="Checked in gateway portal: txn id…" className="w-full rounded border px-2 py-1" />
                          <button className="rounded bg-brand-600 px-2 py-1 font-semibold text-white">Mark paid</button>
                        </form>
                      </details>
                    )}
                  </td><td>{formatPKR(p.amountPaisa)}</td><td className="text-gray-500">{formatDate(p.createdAt)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </section>
          <section className={`${cardCls} p-5`}>
            <h2 className="mb-3 font-semibold">Status history</h2>
            <ol className="space-y-2 border-l-2 pl-4 text-sm">
              {o.statusEvents.map((e) => (
                <li key={e.id}>
                  <span className="font-medium">{e.fromStatus && e.fromStatus !== e.toStatus ? `${ORDER_STATUS_LABEL[e.fromStatus]} → ` : ""}{ORDER_STATUS_LABEL[e.toStatus]}</span>
                  <span className="text-gray-500"> · {formatDate(e.createdAt)} · {e.actorType.toLowerCase()}{e.actor ? ` (${e.actor.name || e.actor.email})` : ""}{e.isPublic ? "" : " · internal"}</span>
                  {e.note && <p className="text-gray-700">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>
          <section className={`${cardCls} p-5`}>
            <h2 className="mb-3 font-semibold">Emails</h2>
            {o.emails.length === 0 ? <p className="text-sm text-gray-500">None.</p> : <ul className="space-y-1 text-sm">{o.emails.map((e) => <li key={e.id}>{formatDate(e.createdAt)} · {e.subject} · <span className={e.status === "SENT" ? "text-emerald-700" : "text-red-600"}>{e.status}</span>{e.error && <span className="text-xs text-gray-400"> ({e.error})</span>}</li>)}</ul>}
          </section>
        </div>
        <div className="space-y-6">
          {o.paymentMethod === "COD" && (
            <section className={`${cardCls} p-5`}>
              <h2 className="mb-2 font-semibold">Cash on delivery</h2>
              {o.paymentStatus === "PAID" ? (
                <p className="text-sm text-emerald-700">Cash collected{o.paidAt ? ` on ${formatDate(o.paidAt)}` : ""}.</p>
              ) : ["PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status) ? (
                <form action={markCodCollectedAction} className="space-y-2">
                  <input type="hidden" name="orderId" value={o.id} />
                  <p className="text-sm text-gray-600">Collect <b>{formatPKR(o.totalPaisa)}</b>. Mark it once the courier has collected or remitted the cash.</p>
                  <input name="note" placeholder="Note (e.g. courier remittance ref)" className="w-full rounded-lg border px-3 py-2 text-sm" />
                  <ConfirmButton message={`Confirm ${formatPKR(o.totalPaisa)} cash was collected for this order?`} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Mark cash collected</ConfirmButton>
                </form>
              ) : (
                <p className="text-sm text-gray-500">Not collected.</p>
              )}
            </section>
          )}
          <section className={`${cardCls} p-5`}><h2 className="mb-3 font-semibold">Update status</h2><StatusForm orderId={o.id} options={options} courierName={o.courierName ?? ""} trackingNumber={o.trackingNumber ?? ""} /></section>
          <section className={`${cardCls} space-y-1 p-5 text-sm`}>
            <h2 className="mb-2 font-semibold">Customer</h2>
            <p>{o.customerName}</p>
            <p><a href={`mailto:${o.email}`} className="text-brand-700 hover:underline">{o.email}</a></p>
            <p><a href={`tel:${o.phone}`} className="text-brand-700 hover:underline">{o.phone}</a> · <a href={`https://wa.me/92${o.phone.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">WhatsApp</a></p>
            <p className="text-gray-500">{o.user ? <Link href={`/admin/customers/${o.user.id}`} className="hover:underline">Registered customer</Link> : "Guest checkout"}</p>
            <h3 className="pt-3 font-semibold">Ship to</h3>
            <p>{o.shipLine1}</p>{o.shipLine2 && <p>{o.shipLine2}</p>}<p>{o.shipCity}{o.shipProvince ? `, ${o.shipProvince}` : ""} {o.shipPostalCode}</p>
            {o.customerNote && <p className="mt-2 rounded bg-amber-50 p-2">Note: {o.customerNote}</p>}
            {o.expiresAt && o.status === "PENDING_PAYMENT" && <p className="pt-2 text-xs text-gray-500">Expires {formatDate(o.expiresAt)} if unpaid</p>}
          </section>
          <section className={`${cardCls} p-5`}><h2 className="mb-3 font-semibold">Shipping & notes</h2><FulfilmentForm orderId={o.id} courierName={o.courierName ?? ""} trackingNumber={o.trackingNumber ?? ""} trackingUrl={o.trackingUrl ?? ""} adminNote={o.adminNote ?? ""} /></section>
        </div>
      </div>
    </div>
  );
}
