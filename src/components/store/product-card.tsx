import Link from "next/link";
import Image from "next/image";
import { formatPKR } from "@/lib/money";
import type { ProductCardData } from "@/server/catalog";
import { ProductPlaceholder } from "./product-placeholder";

export function ProductCard({ p, priority = false }: { p: ProductCardData; priority?: boolean }) {
  const img = p.images[0];
  const v = p.variants[0];
  const compare = v?.compareAtPricePaisa && v.compareAtPricePaisa > v.pricePaisa ? v.compareAtPricePaisa : null;
  const off = compare ? Math.round(((compare - v!.pricePaisa) / compare) * 100) : 0;
  const soldOut = p.totalStock <= 0;
  return (
    <Link href={`/p/${p.slug}`} className="group block rounded-2xl focus-visible:outline-offset-4">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand-100 shadow-[var(--shadow-soft)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lift)]">
        {img ? (
          <Image src={img.url} alt={img.alt || p.name} fill priority={priority} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <ProductPlaceholder name={p.name} className="transition duration-500 group-hover:scale-105" />
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {soldOut && <span className="rounded-full bg-ink-900/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">Sold out</span>}
          {!soldOut && off > 0 && <span className="rounded-full bg-sale px-2.5 py-1 text-[11px] font-bold text-white">-{off}%</span>}
          {!soldOut && p.totalStock > 0 && p.totalStock <= 5 && <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-amber-700 backdrop-blur">Only {p.totalStock} left</span>}
        </div>
        <span className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 rounded-xl bg-white/95 py-2.5 text-center text-sm font-semibold text-ink-900 opacity-0 shadow-lg backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {soldOut ? "View details" : "Shop now"}
        </span>
      </div>
      <div className="px-1 pt-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink-900 group-hover:text-brand-700">{p.name}</h3>
        <p className="mt-1.5 flex items-baseline gap-2">
          <span className="text-base font-bold text-ink-900">{p.minPricePaisa !== p.maxPricePaisa ? `From ${formatPKR(p.minPricePaisa)}` : formatPKR(p.minPricePaisa)}</span>
          {compare && <span className="text-xs text-gray-400 line-through">{formatPKR(compare)}</span>}
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({ items, priorityCount = 0 }: { items: ProductCardData[]; priorityCount?: number }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-sand-50 px-6 py-16 text-center">
        <p className="text-lg font-semibold">No products found</p>
        <p className="mt-1 text-sm text-gray-500">Try a different search or remove some filters.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
      {items.map((p, i) => <div key={p.id} className="reveal"><ProductCard p={p} priority={i < priorityCount} /></div>)}
    </div>
  );
}
