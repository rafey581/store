import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Trash2, ArrowRight, ShieldCheck, Truck } from "lucide-react";
import { findCart } from "@/server/cart";
import { quoteCart } from "@/server/orders";
import { formatPKR } from "@/lib/money";
import { updateCartItem, removeCartItem } from "./actions";
import { CouponForm } from "@/components/store/coupon-form";
import { ProductPlaceholder } from "@/components/store/product-placeholder";
import { CheckoutSteps } from "@/components/store/checkout-steps";
import { cardCls } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await findCart();
  const q = await quoteCart(cart, {});
  if (q.lines.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-50 text-brand-700"><ShoppingBag size={36} /></span>
        <h1 className="mt-6 text-2xl font-extrabold">Your cart is empty</h1>
        <p className="mt-2 text-gray-500">Looks like you haven’t added anything yet.</p>
        <Link href="/search" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-[var(--shadow-glow)] hover:bg-brand-700">Start shopping <ArrowRight size={18} /></Link>
      </div>
    );
  }
  const count = q.lines.reduce((s, l) => s + l.quantity, 0);
  return (
    <div>
      <CheckoutSteps current={1} />
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Shopping cart <span className="text-lg font-semibold text-gray-400">({count} item{count === 1 ? "" : "s"})</span></h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-4">
          {q.lines.map((l) => (
            <li key={l.itemId} className={`${cardCls} flex gap-4 p-4`}>
              <Link href={`/p/${l.productSlug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-sand-100 sm:h-28 sm:w-28">
                {l.imageUrl ? <Image src={l.imageUrl} alt="" fill sizes="112px" className="object-cover" /> : <ProductPlaceholder name={l.productName} className="[&_span]:text-2xl" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/p/${l.productSlug}`} className="line-clamp-2 font-semibold text-ink-900 hover:text-brand-700">{l.productName}</Link>
                    {l.variantTitle !== "Default" && <p className="mt-0.5 text-sm text-gray-500">{l.variantTitle}</p>}
                  </div>
                  <p className="shrink-0 font-bold">{formatPKR(l.lineTotalPaisa)}</p>
                </div>
                <p className="mt-1 text-sm text-gray-500">{formatPKR(l.unitPricePaisa)} each</p>
                {l.problem && <p className="mt-1 text-sm font-semibold text-sale">{l.problem}</p>}
                <div className="mt-auto flex items-center gap-3 pt-3">
                  <form action={updateCartItem} className="flex items-center gap-2">
                    <input type="hidden" name="itemId" value={l.itemId} />
                    <label className="sr-only" htmlFor={`q-${l.itemId}`}>Quantity</label>
                    <select id={`q-${l.itemId}`} name="quantity" defaultValue={l.quantity} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold">
                      {Array.from({ length: Math.max(l.quantity, Math.min(l.stock, 20)) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button className="rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Update</button>
                  </form>
                  <form action={removeCartItem} className="ml-auto">
                    <input type="hidden" name="itemId" value={l.itemId} />
                    <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-500 hover:bg-rose-50 hover:text-sale" aria-label={`Remove ${l.productName}`}><Trash2 size={16} /> Remove</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className={`${cardCls} h-fit space-y-5 p-6 lg:sticky lg:top-32`}>
          <h2 className="text-lg font-bold">Order summary</h2>
          <CouponForm applied={q.couponApplied} error={cart?.couponCode && !q.couponApplied ? q.couponError : null} />
          <dl className="space-y-3 border-t border-gray-100 pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd className="font-semibold">{formatPKR(q.subtotalPaisa)}</dd></div>
            {q.discountPaisa > 0 && <div className="flex justify-between text-brand-700"><dt>Discount</dt><dd className="font-semibold">-{formatPKR(q.discountPaisa)}</dd></div>}
            <div className="flex justify-between"><dt className="text-gray-600">Shipping</dt><dd className="text-gray-500">Calculated at checkout</dd></div>
            <div className="flex justify-between border-t border-gray-100 pt-3 text-base"><dt className="font-bold">Estimated total</dt><dd className="font-extrabold">{formatPKR(q.subtotalPaisa - q.discountPaisa)}</dd></div>
          </dl>
          {q.blocked ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-sale">{q.blocked}</p> : (
            <Link href="/checkout" className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-px hover:bg-brand-700">Checkout <ArrowRight size={18} /></Link>
          )}
          <ul className="space-y-2 text-xs text-gray-500">
            <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand-600" /> Secure checkout</li>
            <li className="flex items-center gap-2"><Truck size={16} className="text-brand-600" /> Delivery across Pakistan</li>
          </ul>
          <Link href="/search" className="block text-center text-sm font-semibold text-gray-600 hover:text-ink-900">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
