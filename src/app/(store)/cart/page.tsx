import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { findCart } from "@/server/cart";
import { quoteCart } from "@/server/orders";
import { formatPKR } from "@/lib/money";
import { updateCartItem, removeCartItem } from "./actions";
import { CouponForm } from "@/components/store/coupon-form";
import { btnPrimary, cardCls } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await findCart();
  const q = await quoteCart(cart, {});
  if (q.lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link href="/" className={`${btnPrimary} mt-6`}>Continue shopping</Link>
      </div>
    );
  }
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Cart</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <ul className="divide-y rounded-xl border lg:col-span-2">
          {q.lines.map((l) => (
            <li key={l.itemId} className="flex gap-4 p-4">
              <Link href={`/p/${l.productSlug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="80px" className="object-cover" />}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/p/${l.productSlug}`} className="font-medium hover:text-brand-700">{l.productName}</Link>
                {l.variantTitle !== "Default" && <p className="text-sm text-gray-500">{l.variantTitle}</p>}
                <p className="text-sm">{formatPKR(l.unitPricePaisa)}</p>
                {l.problem && <p className="text-sm font-medium text-red-600">{l.problem}</p>}
                <div className="mt-2 flex items-center gap-3">
                  <form action={updateCartItem} className="flex items-center gap-1">
                    <input type="hidden" name="itemId" value={l.itemId} />
                    <label className="sr-only" htmlFor={`q-${l.itemId}`}>Quantity</label>
                    <select id={`q-${l.itemId}`} name="quantity" defaultValue={l.quantity} className="rounded border px-2 py-1 text-sm">
                      {Array.from({ length: Math.max(l.quantity, Math.min(l.stock, 20)) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button className="rounded border px-2 py-1 text-xs hover:bg-gray-50">Update</button>
                  </form>
                  <form action={removeCartItem}>
                    <input type="hidden" name="itemId" value={l.itemId} />
                    <button className="text-sm text-red-600 hover:underline">Remove</button>
                  </form>
                </div>
              </div>
              <p className="font-semibold">{formatPKR(l.lineTotalPaisa)}</p>
            </li>
          ))}
        </ul>
        <aside className={`${cardCls} h-fit space-y-4 p-5`}>
          <CouponForm applied={q.couponApplied} error={cart?.couponCode && !q.couponApplied ? q.couponError : null} />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPKR(q.subtotalPaisa)}</dd></div>
            {q.discountPaisa > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd>-{formatPKR(q.discountPaisa)}</dd></div>}
            <div className="flex justify-between text-gray-500"><dt>Shipping</dt><dd>Calculated at checkout</dd></div>
          </dl>
          {q.blocked ? <p className="text-sm text-red-600">{q.blocked}</p> : <Link href="/checkout" className={`${btnPrimary} w-full py-3`}>Checkout</Link>}
          <Link href="/" className="block text-center text-sm text-brand-700 hover:underline">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
