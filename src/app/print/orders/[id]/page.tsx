import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { getSettings } from "@/server/settings";
import { methodLabel } from "@/server/orders";
import { formatPKR } from "@/lib/money";
import { formatDate, orderLabel } from "@/lib/utils";
import { PrintButton } from "@/components/admin/print-button";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

// Printable invoice + packing slip (A4). Staff only.
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("orders");
  const { id } = await params;
  const [o, s] = await Promise.all([db.order.findUnique({ where: { id }, include: { items: true } }), getSettings()]);
  if (!o) notFound();
  const due = o.paymentStatus === "PAID" ? 0 : o.totalPaisa;
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm text-gray-900 print:p-0">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xl font-bold">{s.storeName}</p>
          {s.address && <p className="whitespace-pre-line text-gray-600">{s.address}</p>}
          <p className="text-gray-600">{[s.supportPhone, s.supportEmail].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">INVOICE</p>
          <p>Order {orderLabel(o.number)}</p>
          <p className="text-gray-600">{formatDate(o.createdAt)}</p>
          <div className="mt-2"><PrintButton /></div>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-6">
        <div>
          <p className="mb-1 font-semibold uppercase text-gray-500">Ship to</p>
          <p className="font-medium">{o.customerName}</p>
          <p>{o.shipLine1}</p>
          {o.shipLine2 && <p>{o.shipLine2}</p>}
          <p>{o.shipCity}{o.shipProvince ? `, ${o.shipProvince}` : ""} {o.shipPostalCode ?? ""}</p>
          <p>{o.phone}</p>
        </div>
        <div>
          <p className="mb-1 font-semibold uppercase text-gray-500">Payment</p>
          <p>{methodLabel(o.paymentMethod)}</p>
          <p>{o.paymentStatus === "PAID" ? "Paid" : "Unpaid"}</p>
          {o.courierName && <p className="mt-2">Courier: {o.courierName} {o.trackingNumber ?? ""}</p>}
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-800 text-left"><th className="py-2">Item</th><th>SKU</th><th className="text-right">Price</th><th className="text-right">Qty</th><th className="text-right">Total</th></tr>
        </thead>
        <tbody>
          {o.items.map((it) => (
            <tr key={it.id} className="border-b border-gray-200">
              <td className="py-2">{it.productName}{it.variantTitle !== "Default" ? ` (${it.variantTitle})` : ""}</td>
              <td className="font-mono text-xs">{it.sku}</td>
              <td className="text-right">{formatPKR(it.unitPricePaisa)}</td>
              <td className="text-right">{it.quantity}</td>
              <td className="text-right">{formatPKR(it.lineTotalPaisa)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-4 w-64 space-y-1">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPKR(o.subtotalPaisa)}</dd></div>
        {o.discountPaisa > 0 && <div className="flex justify-between"><dt>Discount{o.couponCode ? ` (${o.couponCode})` : ""}</dt><dd>-{formatPKR(o.discountPaisa)}</dd></div>}
        <div className="flex justify-between"><dt>Shipping</dt><dd>{formatPKR(o.shippingPaisa)}</dd></div>
        {o.codFeePaisa > 0 && <div className="flex justify-between"><dt>COD fee</dt><dd>{formatPKR(o.codFeePaisa)}</dd></div>}
        <div className="flex justify-between border-t border-gray-800 pt-1 text-base font-bold"><dt>Total</dt><dd>{formatPKR(o.totalPaisa)}</dd></div>
        <div className="flex justify-between font-bold"><dt>Amount due</dt><dd>{formatPKR(due)}</dd></div>
      </dl>
      {o.customerNote && <p className="mt-6 rounded border p-2">Customer note: {o.customerNote}</p>}
      <p className="mt-10 text-center text-xs text-gray-500">Thank you for shopping with {s.storeName}.</p>
    </div>
  );
}
