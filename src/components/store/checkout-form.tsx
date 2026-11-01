"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { placeOrderAction, quoteAction, type QuoteView } from "@/app/(store)/checkout/actions";
import { formatPKR } from "@/lib/money";
import { FormMessage, FieldError } from "@/components/ui/form-message";
import { inputCls, labelCls, cardCls } from "@/components/ui/styles";
import { SubmitButton } from "@/components/ui/submit-button";

type Method = { value: string; label: string; description: string };
type Initial = { email: string; customerName: string; phone: string; shipLine1: string; shipLine2: string; shipCity: string; shipProvince: string; shipPostalCode: string };

const PROVINCES = ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad Capital Territory", "Gilgit-Baltistan", "Azad Kashmir"];

export function CheckoutForm({ initial, cities, methods, initialQuote, loggedIn, lines }: { initial: Initial; cities: string[]; methods: Method[]; initialQuote: QuoteView; loggedIn: boolean; lines: { name: string; qty: number; total: number }[] }) {
  const [state, action] = useActionState(placeOrderAction, null);
  const [f, setF] = useState({ ...initial, customerNote: "", paymentMethod: methods[0]?.value ?? "" });
  const [quote, setQuote] = useState<QuoteView>(initialQuote);
  const [quoting, startQuote] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cash on delivery may be unavailable above the store's limit; fall back to the first available method.
  const visibleMethods = methods.filter((m) => m.value !== "COD" || quote.codAllowed);
  const selectedMethod = visibleMethods.some((m) => m.value === f.paymentMethod) ? f.paymentMethod : (visibleMethods[0]?.value ?? "");

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => startQuote(async () => setQuote(await quoteAction(f.shipCity, f.email, selectedMethod))), 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [f.shipCity, f.email, selectedMethod]);


  const bind = (k: keyof typeof f) => ({ name: k, value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value })) });

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className={`${cardCls} grid gap-4 p-6 sm:grid-cols-2`}>
          <h2 className="flex items-center gap-3 text-lg font-bold sm:col-span-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-ink-900 text-xs text-white">1</span> Contact</h2>
          <div className="sm:col-span-2"><label className={labelCls} htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required className={inputCls} {...bind("email")} /><FieldError state={state} name="email" /></div>
          <div><label className={labelCls} htmlFor="customerName">Full name</label><input id="customerName" autoComplete="name" required className={inputCls} {...bind("customerName")} /><FieldError state={state} name="customerName" /></div>
          <div><label className={labelCls} htmlFor="phone">Mobile number</label><input id="phone" type="tel" autoComplete="tel" placeholder="03001234567" required className={inputCls} {...bind("phone")} /><FieldError state={state} name="phone" /></div>
          {!loggedIn && <p className="text-xs text-gray-500 sm:col-span-2">Checking out as a guest. You will get a link to track your order by email. <a href="/login?next=/checkout" className="text-brand-700 hover:underline">Sign in</a> to use saved addresses.</p>}
        </section>

        <section className={`${cardCls} grid gap-4 p-6 sm:grid-cols-2`}>
          <h2 className="flex items-center gap-3 text-lg font-bold sm:col-span-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-ink-900 text-xs text-white">2</span> Delivery address</h2>
          <div className="sm:col-span-2"><label className={labelCls} htmlFor="shipLine1">Address</label><input id="shipLine1" autoComplete="address-line1" placeholder="House no., street, area" required className={inputCls} {...bind("shipLine1")} /><FieldError state={state} name="shipLine1" /></div>
          <div className="sm:col-span-2"><label className={labelCls} htmlFor="shipLine2">Apartment, landmark (optional)</label><input id="shipLine2" autoComplete="address-line2" className={inputCls} {...bind("shipLine2")} /></div>
          <div>
            <label className={labelCls} htmlFor="shipCity">City</label>
            <input id="shipCity" list="cities" autoComplete="address-level2" required className={inputCls} {...bind("shipCity")} />
            <datalist id="cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
            <FieldError state={state} name="shipCity" />
          </div>
          <div>
            <label className={labelCls} htmlFor="shipProvince">Province</label>
            <select id="shipProvince" className={inputCls} {...bind("shipProvince")}>
              <option value="">Select</option>
              {PROVINCES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label className={labelCls} htmlFor="shipPostalCode">Postal code (optional)</label><input id="shipPostalCode" autoComplete="postal-code" className={inputCls} {...bind("shipPostalCode")} /></div>
          <div className="sm:col-span-2"><label className={labelCls} htmlFor="customerNote">Order note (optional)</label><textarea id="customerNote" rows={2} maxLength={500} className={inputCls} {...bind("customerNote")} /></div>
          {loggedIn && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="saveAddress" /> Save this address to my account</label>}
        </section>

        <section className={`${cardCls} space-y-3 p-6`}>
          <h2 className="flex items-center gap-3 text-lg font-bold"><span className="grid h-7 w-7 place-items-center rounded-full bg-ink-900 text-xs text-white">3</span> Payment method</h2>
          {visibleMethods.length === 0 && <p className="text-sm text-red-600">No payment methods are available right now. Please contact the store.</p>}
          {methods.some((m) => m.value === "COD") && !quote.codAllowed && <p className="text-xs text-gray-500">Cash on delivery is not available for this order amount.</p>}
          {visibleMethods.map((m) => (
            <label key={m.value} className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition ${selectedMethod === m.value ? "border-brand-600 bg-brand-50/60 shadow-sm" : "border-gray-100 hover:border-gray-300"}`}>
              <input type="radio" name="paymentMethod" value={m.value} checked={selectedMethod === m.value} onChange={() => setF((s) => ({ ...s, paymentMethod: m.value }))} className="mt-1 h-4 w-4 accent-brand-600" />
              <span><span className="block text-sm font-bold">{m.label}</span><span className="block text-xs text-gray-600">{m.description}</span></span>
            </label>
          ))}
        </section>
      </div>

      <aside className={`${cardCls} h-fit space-y-4 p-6 lg:sticky lg:top-32`}>
        <h2 className="text-lg font-bold">Order summary</h2>
        <ul className="space-y-1 text-sm">
          {lines.map((l, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{l.name} × {l.qty}</span><span>{formatPKR(l.total)}</span></li>)}
        </ul>
        <dl className={`space-y-2 border-t pt-3 text-sm ${quoting ? "opacity-60" : ""}`}>
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPKR(quote.subtotalPaisa)}</dd></div>
          {quote.discountPaisa > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount ({quote.couponApplied})</dt><dd>-{formatPKR(quote.discountPaisa)}</dd></div>}
          {quote.couponError && <p className="text-xs text-amber-700">Coupon not applied: {quote.couponError}</p>}
          {quote.codFeePaisa > 0 && <div className="flex justify-between"><dt>Cash on delivery fee</dt><dd>{formatPKR(quote.codFeePaisa)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{!f.shipCity ? "Enter city" : quote.freeShipping ? "Free" : formatPKR(quote.shippingPaisa)}</dd></div>
          {quote.deliveryDays && f.shipCity && <p className="text-xs text-gray-500">Delivery in {quote.deliveryDays}</p>}
          <div className="flex justify-between border-t pt-3 text-lg font-extrabold"><dt>Total</dt><dd>{formatPKR(quote.totalPaisa)}</dd></div>
        </dl>
        <FormMessage state={state} />
        {quote.blocked ? <p className="text-sm text-red-600">{quote.blocked}</p> : (
          <SubmitButton disabled={visibleMethods.length === 0} className="w-full rounded-xl bg-brand-600 py-4 text-base font-bold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-px hover:bg-brand-700 disabled:opacity-50" pendingText="Placing order…">Place order</SubmitButton>
        )}
        <p className="text-xs text-gray-500">The final amount is calculated by our server when you place the order.</p>
      </aside>
    </form>
  );
}
