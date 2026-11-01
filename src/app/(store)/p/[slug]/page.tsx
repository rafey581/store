import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, productCardSelect } from "@/server/catalog";
import { db } from "@/server/db";
import { ProductGrid } from "@/components/store/product-card";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { SectionHeading } from "@/components/store/section-heading";
import { formatPKR } from "@/lib/money";
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
  const [settings, related] = await Promise.all([
    getSettings(),
    db.product.findMany({ where: { status: "ACTIVE", id: { not: p.id }, ...(p.categoryId ? { categoryId: p.categoryId } : {}) }, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }], take: 4, select: productCardSelect }),
  ]);
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
      ...(p.category ? [{ "@type": "ListItem", position: 2, name: p.category.name, item: siteUrl(`/c/${p.category.slug}`) }] : []),
      { "@type": "ListItem", position: p.category ? 3 : 2, name: p.name, item: siteUrl(`/p/${p.slug}`) },
    ],
  };
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]).replace(/</g, "\\u003c") }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, ...(p.category ? [{ label: p.category.name, href: `/c/${p.category.slug}` }] : []), { label: p.name }]} />
      <ProductPurchase
        name={p.name}
        category={p.category}
        images={p.images.map((i) => ({ url: i.url, alt: i.alt }))}
        options={options}
        variants={variants}
        codEnabled={settings.enableCod}
        deliveryText={settings.freeShippingAbovePaisa ? `2–5 working days. Free over ${formatPKR(settings.freeShippingAbovePaisa)}` : "2–5 working days across Pakistan"}
      />
      {p.description && (
        <section className="mt-16 grid gap-8 lg:grid-cols-[1fr_2fr]">
          <h2 className="text-2xl font-extrabold tracking-tight">Product details</h2>
          <div className="prose-store whitespace-pre-line rounded-2xl border border-gray-100 bg-white p-6 text-[15px] text-gray-700 shadow-[var(--shadow-soft)]">{p.description}</div>
        </section>
      )}
      {related.length > 0 && (
        <section className="mt-16">
          <SectionHeading eyebrow="More to explore" title="You may also like" href={p.category ? `/c/${p.category.slug}` : "/search"} />
          <ProductGrid items={related} />
        </section>
      )}
    </div>
  );
}
