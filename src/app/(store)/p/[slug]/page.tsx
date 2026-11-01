import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/server/catalog";
import { ProductPurchase } from "@/components/store/product-purchase";
import { siteUrl } from "@/lib/utils";
import { getSettings } from "@/server/settings";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return {};
  const description = p.seoDescription || p.description.slice(0, 160) || `Buy ${p.name} online in Pakistan.`;
  return {
    title: p.seoTitle || p.name,
    description,
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { title: p.name, description, images: p.images.slice(0, 1).map((i) => ({ url: i.url })) },
  };
}

export default async function ProductPage({ params }: Props) {
  const p = await getProductBySlug((await params).slug);
  if (!p || p.variants.length === 0) notFound();
  const settings = await getSettings();
  const options = p.options.map((o) => ({ id: o.id, name: o.name, values: o.values.map((v) => ({ id: v.id, value: v.value })) }));
  const variants = p.variants.map((v) => ({
    id: v.id,
    title: v.title,
    pricePaisa: v.pricePaisa,
    compareAtPricePaisa: v.compareAtPricePaisa,
    stock: v.stock,
    optionValueIds: v.optionValues.map((ov) => ov.optionValueId),
    imageUrl: p.images.find((i) => i.id === v.imageId)?.url ?? null,
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description.slice(0, 500),
    image: p.images.map((i) => (i.url.startsWith("http") ? i.url : siteUrl(i.url))),
    sku: p.variants[0].sku,
    brand: { "@type": "Brand", name: settings.storeName },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "PKR",
      lowPrice: (p.minPricePaisa / 100).toFixed(2),
      highPrice: (p.maxPricePaisa / 100).toFixed(2),
      offerCount: p.variants.length,
      availability: p.totalStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: siteUrl(`/p/${p.slug}`),
    },
  };
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">Home</Link>
        {p.category && <> / <Link href={`/c/${p.category.slug}`} className="hover:underline">{p.category.name}</Link></>}
        {" / "}<span className="text-gray-900">{p.name}</span>
      </nav>
      <ProductPurchase name={p.name} images={p.images.map((i) => ({ url: i.url, alt: i.alt }))} options={options} variants={variants} />
      {p.description && (
        <section className="mt-12 max-w-3xl">
          <h2 className="mb-3 text-lg font-semibold">Description</h2>
          <div className="prose-store whitespace-pre-line text-gray-700">{p.description}</div>
        </section>
      )}
    </div>
  );
}
