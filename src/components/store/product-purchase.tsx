"use client";
import { useActionState, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { addToCart } from "@/app/(store)/cart/actions";
import { formatPKR } from "@/lib/money";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

type Option = { id: string; name: string; values: { id: string; value: string }[] };
type Variant = { id: string; title: string; pricePaisa: number; compareAtPricePaisa: number | null; stock: number; optionValueIds: string[]; imageUrl: string | null };
type Img = { url: string; alt: string | null };

export function ProductPurchase({ name, images, options, variants }: { name: string; images: Img[]; options: Option[]; variants: Variant[] }) {
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
  const shownImg = variant?.imageUrl ? { url: variant.imageUrl, alt: name } : images[activeImg];
  const [state, action] = useActionState(addToCart, null);

  const valueAvailable = (optionId: string, valueId: string) => {
    const probe = { ...selected, [optionId]: valueId };
    const ids = Object.values(probe);
    return variants.some((v) => ids.every((id) => v.optionValueIds.includes(id)) && v.stock > 0);
  };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
          {shownImg ? <Image src={shownImg.url} alt={shownImg.alt || name} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /> : <div className="flex h-full items-center justify-center text-gray-400">No image</div>}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button key={img.url} type="button" onClick={() => setActiveImg(i)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === activeImg && !variant?.imageUrl ? "border-brand-600" : "border-transparent"}`} aria-label={`Show image ${i + 1}`}>
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{name}</h1>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-2xl font-semibold text-gray-900">{variant ? formatPKR(variant.pricePaisa) : "—"}</span>
          {variant?.compareAtPricePaisa && variant.compareAtPricePaisa > variant.pricePaisa && <span className="text-gray-400 line-through">{formatPKR(variant.compareAtPricePaisa)}</span>}
        </div>
        <p className="mt-1 text-sm">
          {!variant ? <span className="text-gray-500">Select options</span> : variant.stock > 0 ? <span className="text-emerald-700">{variant.stock <= 5 ? `Only ${variant.stock} left` : "In stock"}</span> : <span className="text-red-600">Out of stock</span>}
        </p>

        <form action={action} className="mt-6 space-y-5">
          {options.map((o) => (
            <fieldset key={o.id}>
              <legend className="mb-2 text-sm font-medium">{o.name}</legend>
              <div className="flex flex-wrap gap-2">
                {o.values.map((v) => {
                  const active = selected[o.id] === v.id;
                  const avail = valueAvailable(o.id, v.id);
                  return (
                    <button key={v.id} type="button" onClick={() => setSelected((s) => ({ ...s, [o.id]: v.id }))} className={`rounded-lg border px-3 py-1.5 text-sm ${active ? "border-brand-600 bg-brand-50 font-semibold text-brand-800" : "border-gray-300 hover:border-gray-500"} ${avail ? "" : "text-gray-400 line-through"}`} aria-pressed={active}>
                      {v.value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <input type="hidden" name="variantId" value={variant?.id ?? ""} />
          <div className="flex items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Quantity</span>
              <input name="quantity" type="number" min={1} max={Math.max(1, Math.min(50, variant?.stock ?? 1))} defaultValue={1} className="w-20 rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <SubmitButton disabled={!variant || variant.stock <= 0} className="flex-1 rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50" pendingText="Adding…">
              Add to cart
            </SubmitButton>
          </div>
          <FormMessage state={state} />
          {state?.ok && <Link href="/cart" className="inline-block text-sm font-medium text-brand-700 hover:underline">View cart & checkout →</Link>}
        </form>
      </div>
    </div>
  );
}
