import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { db } from "@/server/db";
import { getNavCategories, productCardSelect } from "@/server/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { ProductPlaceholder } from "@/components/store/product-placeholder";
import { SectionHeading } from "@/components/store/section-heading";
import { TrustStrip, PaymentBadges } from "@/components/store/trust-strip";
import { getSettings } from "@/server/settings";
import { formatPKR } from "@/lib/money";

export default async function HomePage() {
  const [settings, categories, featured, latest, onSale] = await Promise.all([
    getSettings(),
    getNavCategories(),
    db.product.findMany({ where: { status: "ACTIVE", isFeatured: true }, orderBy: { updatedAt: "desc" }, take: 8, select: productCardSelect }),
    db.product.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 8, select: productCardSelect }),
    db.product.findMany({ where: { status: "ACTIVE", variants: { some: { isActive: true, compareAtPricePaisa: { not: null } } } }, orderBy: { updatedAt: "desc" }, take: 4, select: productCardSelect }),
  ]);
  const showcase = (featured.length ? featured : latest).slice(0, 3);

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* Hero */}
      <section className="bg-hero relative -mx-4 overflow-hidden px-4 sm:mx-0 sm:rounded-[2rem]">
        <div className="bg-dots absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative grid items-center gap-10 py-14 sm:px-10 sm:py-16 lg:grid-cols-2 lg:px-14 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-200 ring-1 ring-white/15 backdrop-blur">
              <Sparkles size={14} /> New season collection
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {settings.heroTitle ? settings.heroTitle : (<>Shop smarter at <span className="text-gradient">{settings.storeName}</span></>)}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-gray-300 sm:text-lg">
              {settings.heroSubtitle || "Quality products at honest prices, delivered to your door anywhere in Pakistan."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/search" className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-sm font-bold text-ink-900 shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-brand-400">
                Shop now <ArrowRight size={18} />
              </Link>
              {categories[0] && (
                <Link href={`/c/${categories[0].slug}`} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3.5 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/15">
                  Explore {categories[0].name}
                </Link>
              )}
            </div>
            <div className="mt-8 flex items-center gap-3 text-sm text-gray-300">
              <span className="flex text-gold" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={16} fill="currentColor" />)}</span>
              Trusted by shoppers across Pakistan
            </div>
          </div>
          {showcase.length > 0 && (
            <div className="relative mx-auto hidden h-[420px] w-full max-w-md sm:block">
              {showcase.map((p, i) => {
                const pos = ["left-0 top-16 w-48 -rotate-[8deg]", "left-1/2 top-0 z-10 w-56 -translate-x-1/2", "right-0 top-16 w-48 rotate-[8deg]"][showcase.length === 1 ? 1 : i];
                return (
                  <Link key={p.id} href={`/p/${p.slug}`} className={`absolute ${pos} overflow-hidden rounded-3xl bg-white p-2 shadow-2xl transition duration-300 hover:rotate-0 hover:scale-105`}>
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                      {p.images[0] ? (
                        <Image src={p.images[0].url} alt={p.images[0].alt || p.name} fill priority={i === 1} sizes="240px" className="object-cover" />
                      ) : (
                        <ProductPlaceholder name={p.name} />
                      )}
                    </div>
                    <div className="flex items-center justify-between px-2 py-2">
                      <span className="line-clamp-1 text-xs font-semibold text-ink-900">{p.name}</span>
                      <span className="ml-2 shrink-0 text-xs font-bold text-brand-700">{formatPKR(p.minPricePaisa)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <TrustStrip cod={settings.enableCod} />

      {categories.length > 0 && (
        <section className="reveal">
          <SectionHeading eyebrow="Browse" title="Shop by category" href="/search" linkText="All products" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.slice(0, 8).map((c) => (
              <Link key={c.id} href={`/c/${c.slug}`} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-800 shadow-[var(--shadow-soft)]">
                {c.imageUrl ? (
                  <Image src={c.imageUrl} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-110" />
                ) : (
                  <ProductPlaceholder name={c.name} className="transition duration-500 group-hover:scale-110" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
                  <span className="text-base font-bold text-white sm:text-lg">{c.name}</span>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink-900 transition group-hover:translate-x-0.5 group-hover:bg-brand-400"><ArrowRight size={16} /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section>
          <SectionHeading eyebrow="Handpicked" title="Featured products" href="/search" />
          <ProductGrid items={featured} />
        </section>
      )}

      {/* Promo band */}
      <section className="bg-promo reveal relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-12 sm:py-14">
        <div className="bg-dots absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-100">Pay your way</p>
            <h2 className="mt-2 max-w-xl text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {settings.freeShippingAbovePaisa ? `Free delivery on orders over ${formatPKR(settings.freeShippingAbovePaisa)}` : "Fast delivery across Pakistan"}
            </h2>
            <p className="mt-2 text-brand-50">Card, JazzCash, Easypaisa, bank transfer{settings.enableCod ? " or cash on delivery" : ""}.</p>
          </div>
          <Link href="/search" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-ink-900 shadow-lg transition hover:-translate-y-0.5">
            Start shopping <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {onSale.length > 0 && (
        <section>
          <SectionHeading eyebrow="Limited time" title="On sale now" href="/search?sort=price-asc" />
          <ProductGrid items={onSale} />
        </section>
      )}

      <section>
        <SectionHeading eyebrow="Just in" title="New arrivals" href="/search?sort=newest" />
        <ProductGrid items={latest} />
      </section>

      <section className="reveal rounded-[2rem] border border-gray-100 bg-sand-50 px-6 py-10 text-center sm:px-12">
        <h2 className="text-2xl font-extrabold tracking-tight">Questions before you buy?</h2>
        <p className="mx-auto mt-2 max-w-lg text-gray-600">Our team is happy to help with sizes, delivery times and payments.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/pages/contact-us" className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-6 py-3 text-sm font-bold text-white hover:bg-ink-700">Contact us</Link>
          <Link href="/track" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-ink-900 ring-1 ring-gray-200 hover:bg-gray-50">Track an order</Link>
        </div>
        <div className="mt-8 flex justify-center"><PaymentBadges /></div>
      </section>
    </div>
  );
}
