import Link from "next/link";
import Image from "next/image";
import { formatPKR } from "@/lib/money";
import type { ProductCardData } from "@/server/catalog";

export function ProductCard({ p }: { p: ProductCardData }) {
  const img = p.images[0];
  const v = p.variants[0];
  const onSale = v?.compareAtPricePaisa && v.compareAtPricePaisa > v.pricePaisa;
  return (
    <Link href={`/p/${p.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
        {img ? (
          <Image src={img.url} alt={img.alt || p.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">No image</div>
        )}
        {p.totalStock <= 0 && <span className="absolute left-2 top-2 rounded-full bg-gray-900/80 px-2 py-0.5 text-xs font-medium text-white">Sold out</span>}
        {onSale && p.totalStock > 0 && <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">Sale</span>}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-brand-700">{p.name}</h3>
      <p className="mt-0.5 text-sm">
        <span className="font-semibold">{p.minPricePaisa !== p.maxPricePaisa ? `From ${formatPKR(p.minPricePaisa)}` : formatPKR(p.minPricePaisa)}</span>
        {onSale && <span className="ml-2 text-xs text-gray-400 line-through">{formatPKR(v!.compareAtPricePaisa!)}</span>}
      </p>
    </Link>
  );
}

export function ProductGrid({ items }: { items: ProductCardData[] }) {
  if (items.length === 0) return <p className="py-12 text-center text-gray-500">No products found.</p>;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}
