"use client";
import { useActionState, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Truck, RotateCcw, ShieldCheck, Banknote, Check } from "lucide-react";
import { addToCart } from "@/app/(store)/cart/actions";
import { formatPKR } from "@/lib/money";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { ProductPlaceholder } from "./product-placeholder";

type Option = { id: string; name: string; values: { id: string; value: string }[] };
type Variant = { id: string; title: string; pricePaisa: number; compareAtPricePaisa: number | null; stock: number; optionValueIds: string[]; imageUrl: string | null };
type Img = { url: string; alt: string | null };

export function ProductPurchase({ name, category, images, options, variants, codEnabled, deliveryText }: { name: string; category: { name: string; slug: string } | null; images: Img[]; options: Option[]; variants: Variant[]; codEnabled: boolean; deliveryText: string }) {
  const first = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const o of options) {
      const val = o.values.find((v) => first?.optionValueIds.includes(v.id));
      if (val) init[o.id] = val.id;
    }
    return init;
  });
  const variant = useMemo(() => {
    if (options.length === 0) return variants[0];
    const ids = Object.values(selected);
    if (ids.length !== options.length) return undefined;
    return variants.find((v) => ids.every((id) => v.optionValueIds.includes(id)));
  }, [selected, options.length, variants]);

  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const shownImg = variant?.imageUrl ? { url: variant.imageUrl, alt: name } : images[activeImg];
  const [state, action] = useActionState(addToCart, null);
  const maxQty = Math.max(1, Math.min(50, variant?.stock ?? 1));
  const compare = variant?.compareAtPricePaisa && variant.compareAtPricePaisa > variant.pricePaisa ? variant.compareAtPricePaisa : null;

  const valueAvailable = (optionId: string, valueId: string) => {
    const probe = { ...selected, [optionId]: valueId };
    const ids = Object.values(probe);
    return variants.some((v) => ids.every((id) => v.optionValueIds.includes(id)) && v.stock > 0);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      {/* Gallery */}
      <div className="lg:sticky lg:top-32 lg:self-start">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-sand-100 shadow-[var(--shadow-soft)]">
          {shownImg ? (
            <Image src={shownImg.url} alt={shownImg.alt || name} fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" />
          ) : (
            <ProductPlaceholder name={name} />
          )}
          {compare && <span className="absolute left-4 top-4 rounded-full bg-sale px-3 py-1 text-xs font-bold text-white">Save {formatPKR(compare - variant!.pricePaisa)}</span>}
        </div>
        {images.length > 1 && (
          <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto">
            {images.map((img, i) => (
              <button key={img.url} type="button" onClick={() => setActiveImg(i)} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-2 transition ${i === activeImg && !variant?.imageUrl ? "ring-brand-600" : "ring-transparent hover:ring-gray-300"}`} aria-label={`Show image ${i + 1}`}>
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Purchase panel */}
      <div>
        {category && <Link href={`/c/${category.slug}`} className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700 hover:underline">{category.name}</Link>}
        <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl">{name}</h1>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-3xl font-extrabold text-ink-900">{variant ? formatPKR(variant.pricePaisa) : "—"}</span>
          {compare && (
            <>
              <span className="text-lg text-gray-400 line-through">{formatPKR(compare)}</span>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-sale">-{Math.round(((compare - variant!.pricePaisa) / compare) * 100)}%</span>
            </>
          )}
        </div>
        <p className="mt-2 flex items-center gap-2 text-sm font-medium">
          {!variant ? (
            <span className="text-gray-500">Select options</span>
          ) : variant.stock > 0 ? (
            <><span className="h-2 w-2 rounded-full bg-brand-500 ring-4 ring-brand-100" /><span className="text-brand-700">{variant.stock <= 5 ? `Only ${variant.stock} left — order soon` : "In stock, ready to ship"}</span></>
          ) : (
            <><span className="h-2 w-2 rounded-full bg-sale ring-4 ring-rose-100" /><span className="text-sale">Out of stock</span></>
          )}
        </p>

        <form action={action} className="mt-7 space-y-6">
          {options.map((o) => (
            <fieldset key={o.id}>
              <legend className="mb-3 text-sm font-semibold text-ink-900">
                {o.name}: <span className="font-normal text-gray-500">{o.values.find((v) => v.id === selected[o.id])?.value ?? "Choose"}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {o.values.map((v) => {
                  const active = selected[o.id] === v.id;
                  const avail = valueAvailable(o.id, v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelected((s) => ({ ...s, [o.id]: v.id }))}
                      aria-pressed={active}
                      className={`min-w-12 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${active ? "border-ink-900 bg-ink-900 text-white shadow-md" : "border-gray-200 bg-white text-ink-900 hover:border-ink-900"} ${avail ? "" : "text-gray-400 line-through opacity-60"}`}
                    >
                      {v.value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <input type="hidden" name="variantId" value={variant?.id ?? ""} />
          <input type="hidden" name="quantity" value={Math.min(qty, maxQty)} />
          <div className="flex items-stretch gap-3">
            <div className="flex items-center rounded-xl border border-gray-200 bg-white" role="group" aria-label="Quantity">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-full w-11 place-items-center text-gray-600 hover:text-ink-900" aria-label="Decrease quantity"><Minus size={16} /></button>
              <span className="w-8 text-center text-sm font-bold" aria-live="polite">{Math.min(qty, maxQty)}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="grid h-full w-11 place-items-center text-gray-600 hover:text-ink-900" aria-label="Increase quantity"><Plus size={16} /></button>
            </div>
            <SubmitButton disabled={!variant || variant.stock <= 0} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-bold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-px hover:bg-brand-700 disabled:translate-y-0 disabled:bg-gray-300 disabled:shadow-none" pendingText="Adding…">
              <ShoppingBag size={19} /> {variant && variant.stock <= 0 ? "Out of stock" : "Add to cart"}
            </SubmitButton>
          </div>
          <FormMessage state={state} />
          {state?.ok && (
            <Link href="/cart" className="flex items-center justify-center gap-2 rounded-xl bg-ink-900 px-6 py-3.5 text-sm font-bold text-white hover:bg-ink-700">
              <Check size={18} /> View cart & checkout
            </Link>
          )}
        </form>

        <ul className="mt-8 divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-sand-50 text-sm">
          <li className="flex items-center gap-3 p-4"><Truck size={20} className="shrink-0 text-brand-700" /><span><b className="font-semibold">Delivery:</b> {deliveryText}</span></li>
          {codEnabled && <li className="flex items-center gap-3 p-4"><Banknote size={20} className="shrink-0 text-brand-700" /><span><b className="font-semibold">Cash on delivery</b> available</span></li>}
          <li className="flex items-center gap-3 p-4"><RotateCcw size={20} className="shrink-0 text-brand-700" /><span><b className="font-semibold">Easy returns</b> within 7 days</span></li>
          <li className="flex items-center gap-3 p-4"><ShieldCheck size={20} className="shrink-0 text-brand-700" /><span><b className="font-semibold">Secure payment:</b> card, JazzCash, Easypaisa or bank</span></li>
        </ul>
      </div>
    </div>
  );
}
