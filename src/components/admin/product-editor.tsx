"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProduct } from "@/app/admin/products/actions";
import { rupeesToPaisa, paisaToRupeeInput } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { inputCls, labelCls, btnPrimary, btnSecondary, cardCls } from "@/components/ui/styles";

type Img = { id?: string; url: string; key: string; alt: string };
type Opt = { name: string; valuesText: string };
type Var = {
  id?: string;
  options: string[];
  sku: string;
  price: string;
  compareAt: string;
  cost: string;
  stock: string;
  lowStock: string;
  weight: string;
  isActive: boolean;
  imageKey: string;
};

export type ProductEditorInitial = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categoryId: string | null;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
  images: Img[];
  options: { name: string; values: string[] }[];
  variants: {
    id?: string;
    options: string[];
    sku: string;
    pricePaisa: number;
    compareAtPricePaisa: number | null;
    costPaisa: number | null;
    stock: number;
    lowStockThreshold: number | null;
    weightGrams: number | null;
    isActive: boolean;
    imageKey: string | null;
  }[];
};

const parseValues = (t: string) => Array.from(new Set(t.split(",").map((s) => s.trim()).filter(Boolean)));

function cartesian(lists: string[][]): string[][] {
  return lists.reduce<string[][]>((acc, list) => acc.flatMap((a) => list.map((v) => [...a, v])), [[]]);
}

function emptyVariant(options: string[], skuBase: string, idx: number): Var {
  const suffix = options.length ? "-" + options.map((o) => slugify(o).toUpperCase()).join("-") : "";
  return { options, sku: `${skuBase || "SKU"}${suffix || (idx ? `-${idx}` : "")}`.slice(0, 64), price: "", compareAt: "", cost: "", stock: "0", lowStock: "", weight: "", isActive: true, imageKey: "" };
}

export function ProductEditor({ initial, categories }: { initial: ProductEditorInitial; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [description, setDescription] = useState(initial.description);
  const [status, setStatus] = useState(initial.status);
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "");
  const [isFeatured, setIsFeatured] = useState(initial.isFeatured);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription);
  const [images, setImages] = useState<Img[]>(initial.images);
  const [options, setOptions] = useState<Opt[]>(initial.options.map((o) => ({ name: o.name, valuesText: o.values.join(", ") })));
  const [variants, setVariants] = useState<Var[]>(
    initial.variants.length
      ? initial.variants.map((v) => ({
          id: v.id,
          options: v.options,
          sku: v.sku,
          price: paisaToRupeeInput(v.pricePaisa),
          compareAt: paisaToRupeeInput(v.compareAtPricePaisa),
          cost: paisaToRupeeInput(v.costPaisa),
          stock: String(v.stock),
          lowStock: v.lowStockThreshold === null ? "" : String(v.lowStockThreshold),
          weight: v.weightGrams === null ? "" : String(v.weightGrams),
          isActive: v.isActive,
          imageKey: v.imageKey ?? "",
        }))
      : [emptyVariant([], "", 0)],
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const skuBase = slugify(name).toUpperCase().slice(0, 20);

  function regenerateVariants(nextOptions: Opt[]) {
    const lists = nextOptions.map((o) => parseValues(o.valuesText)).filter((l, i) => nextOptions[i].name.trim() && l.length);
    const combos = lists.length ? cartesian(lists) : [[]];
    setVariants((prev) =>
      combos.map((combo, i) => {
        const match = prev.find((v) => v.options.join("\u0000") === combo.join("\u0000"));
        if (match) return match;
        const base = prev[0] && prev[0].options.length === 0 && combo.length > 0 ? prev[0] : null;
        const fresh = emptyVariant(combo, skuBase, i);
        return base ? { ...fresh, price: base.price, compareAt: base.compareAt, cost: base.cost } : { ...fresh, price: prev[0]?.price ?? "" };
      }),
    );
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        setImages((imgs) => [...imgs, { url: json.url, key: json.key, alt: "" }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function moveImage(i: number, dir: -1 | 1) {
    setImages((imgs) => {
      const j = i + dir;
      if (j < 0 || j >= imgs.length) return imgs;
      const copy = [...imgs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function updateVariant(i: number, patch: Partial<Var>) {
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  function applyToAll(field: "price" | "stock" | "compareAt") {
    const v = variants[0]?.[field] ?? "";
    setVariants((vs) => vs.map((x) => ({ ...x, [field]: v })));
  }

  function submit() {
    setError(null);
    setMessage(null);
    const cleanOptions = options.map((o) => ({ name: o.name.trim(), values: parseValues(o.valuesText) })).filter((o) => o.name && o.values.length);
    const builtVariants = [];
    for (const v of variants) {
      const price = rupeesToPaisa(v.price);
      if (price === null) return setError(`Enter a valid price for ${v.options.join(" / ") || "the product"}.`);
      const compare = v.compareAt.trim() ? rupeesToPaisa(v.compareAt) : null;
      if (v.compareAt.trim() && compare === null) return setError(`Invalid compare-at price for ${v.sku}.`);
      const cost = v.cost.trim() ? rupeesToPaisa(v.cost) : null;
      const stock = Number(v.stock);
      if (!Number.isInteger(stock) || stock < 0) return setError(`Stock must be a whole number for ${v.sku}.`);
      builtVariants.push({
        id: v.id,
        sku: v.sku.trim(),
        pricePaisa: price,
        compareAtPricePaisa: compare,
        costPaisa: cost,
        stock,
        lowStockThreshold: v.lowStock.trim() ? Number(v.lowStock) : null,
        weightGrams: v.weight.trim() ? Number(v.weight) : null,
        isActive: v.isActive,
        imageKey: v.imageKey || null,
        options: v.options,
      });
    }
    const payload = {
      id: initial.id,
      name,
      slug,
      description,
      status,
      categoryId: categoryId || null,
      isFeatured,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      options: cleanOptions,
      images: images.map((i) => ({ id: i.id, url: i.url, key: i.key, alt: i.alt || null })),
      variants: builtVariants,
    };
    startTransition(async () => {
      const res = await saveProduct(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage("Saved.");
      if (!initial.id) router.push(`/admin/products/${res.id}`);
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className={`${cardCls} space-y-4 p-5`}>
          <div>
            <label className={labelCls} htmlFor="name">Product name</label>
            <input id="name" className={inputCls} value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
          </div>
          <div>
            <label className={labelCls} htmlFor="slug">URL slug</label>
            <div className="flex items-center gap-2 text-sm text-gray-500">/p/<input id="slug" className={inputCls} value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} /></div>
          </div>
          <div>
            <label className={labelCls} htmlFor="desc">Description</label>
            <textarea id="desc" rows={8} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
            <p className="mt-1 text-xs text-gray-500">Plain text. Line breaks are kept.</p>
          </div>
        </section>

        <section className={`${cardCls} p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Images</h2>
            <label className={`${btnSecondary} cursor-pointer`}>
              {uploading ? "Uploading…" : "Upload images"}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={uploading} onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
          {images.length === 0 && <p className="text-sm text-gray-500">No images yet. JPG, PNG or WebP, max 5 MB each. The first image is the main image.</p>}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((img, i) => (
              <li key={img.key} className="rounded-lg border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt} className="aspect-square w-full rounded object-cover" />
                <input className="mt-2 w-full rounded border px-2 py-1 text-xs" placeholder="Alt text" value={img.alt} onChange={(e) => setImages((imgs) => imgs.map((x, idx) => (idx === i ? { ...x, alt: e.target.value } : x)))} />
                <div className="mt-1 flex justify-between text-xs">
                  <span className="space-x-1">
                    <button type="button" onClick={() => moveImage(i, -1)} className="rounded px-1 hover:bg-gray-100" aria-label="Move left">◀</button>
                    <button type="button" onClick={() => moveImage(i, 1)} className="rounded px-1 hover:bg-gray-100" aria-label="Move right">▶</button>
                  </span>
                  <button type="button" onClick={() => setImages((imgs) => imgs.filter((_, idx) => idx !== i))} className="text-red-600 hover:underline">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${cardCls} p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Options</h2>
            {options.length < 3 && (
              <button type="button" className={btnSecondary} onClick={() => setOptions((o) => [...o, { name: o.length === 0 ? "Size" : o.length === 1 ? "Color" : "Material", valuesText: "" }])}>Add option</button>
            )}
          </div>
          {options.length === 0 && <p className="text-sm text-gray-500">No options. The product has a single variant. Add options like Size or Color to sell variants.</p>}
          <div className="space-y-3">
            {options.map((o, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
                <input className={inputCls} value={o.name} placeholder="Option name" onChange={(e) => setOptions((os) => os.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))} />
                <input className={inputCls} value={o.valuesText} placeholder="Values, comma separated: S, M, L" onChange={(e) => setOptions((os) => os.map((x, idx) => (idx === i ? { ...x, valuesText: e.target.value } : x)))} />
                <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => { const next = options.filter((_, idx) => idx !== i); setOptions(next); regenerateVariants(next); }}>Remove</button>
              </div>
            ))}
          </div>
          {options.length > 0 && <button type="button" className={`${btnSecondary} mt-3`} onClick={() => regenerateVariants(options)}>Update variants from options</button>}
        </section>

        <section className={`${cardCls} p-5`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Variants, price and stock</h2>
            {variants.length > 1 && (
              <div className="flex gap-2 text-xs">
                <button type="button" className="text-brand-700 hover:underline" onClick={() => applyToAll("price")}>Copy first price to all</button>
                <button type="button" className="text-brand-700 hover:underline" onClick={() => applyToAll("stock")}>Copy first stock to all</button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr><th className="py-2 pr-2">Variant</th><th className="pr-2">SKU</th><th className="pr-2">Price (Rs)</th><th className="pr-2">Compare at</th><th className="pr-2">Cost</th><th className="pr-2">Stock</th><th className="pr-2">Image</th><th>Active</th></tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v.options.join("|") + i} className="border-t">
                    <td className="py-2 pr-2 font-medium">{v.options.join(" / ") || "Default"}</td>
                    <td className="pr-2"><input className="w-36 rounded border px-2 py-1" value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} /></td>
                    <td className="pr-2"><input inputMode="decimal" className="w-24 rounded border px-2 py-1" value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} /></td>
                    <td className="pr-2"><input inputMode="decimal" className="w-24 rounded border px-2 py-1" value={v.compareAt} onChange={(e) => updateVariant(i, { compareAt: e.target.value })} /></td>
                    <td className="pr-2"><input inputMode="decimal" className="w-20 rounded border px-2 py-1" value={v.cost} onChange={(e) => updateVariant(i, { cost: e.target.value })} /></td>
                    <td className="pr-2"><input inputMode="numeric" className="w-20 rounded border px-2 py-1" value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} /></td>
                    <td className="pr-2">
                      <select className="w-24 rounded border px-1 py-1" value={v.imageKey} onChange={(e) => updateVariant(i, { imageKey: e.target.value })}>
                        <option value="">—</option>
                        {images.map((img, idx) => <option key={img.key} value={img.key}>Image {idx + 1}</option>)}
                      </select>
                    </td>
                    <td><input type="checkbox" checked={v.isActive} onChange={(e) => updateVariant(i, { isActive: e.target.checked })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className={`${cardCls} space-y-4 p-5`}>
          <div>
            <label className={labelCls} htmlFor="status">Status</label>
            <select id="status" className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="DRAFT">Draft (hidden)</option>
              <option value="ACTIVE">Active (visible in store)</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="cat">Category</label>
            <select id="cat" className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} /> Feature on home page</label>
        </section>
        <section className={`${cardCls} space-y-4 p-5`}>
          <h2 className="font-semibold">Search engine listing</h2>
          <div>
            <label className={labelCls} htmlFor="seoTitle">Page title</label>
            <input id="seoTitle" maxLength={70} className={inputCls} value={seoTitle} placeholder={name} onChange={(e) => setSeoTitle(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="seoDesc">Meta description</label>
            <textarea id="seoDesc" maxLength={170} rows={3} className={inputCls} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
          </div>
        </section>
        <div className="sticky bottom-4 space-y-2">
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
          <button type="button" onClick={submit} disabled={pending || uploading} className={`${btnPrimary} w-full py-3`}>{pending ? "Saving…" : initial.id ? "Save changes" : "Create product"}</button>
        </div>
      </div>
    </div>
  );
}
