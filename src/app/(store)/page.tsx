import Link from "next/link";
import Image from "next/image";
import { db } from "@/server/db";
import { getNavCategories, productCardSelect } from "@/server/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { getSettings } from "@/server/settings";



export default async function HomePage() {
  const [settings, categories, featured, latest] = await Promise.all([
    getSettings(),
    getNavCategories(),
    db.product.findMany({ where: { status: "ACTIVE", isFeatured: true }, orderBy: { updatedAt: "desc" }, take: 8, select: productCardSelect }),
    db.product.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 8, select: productCardSelect }),
  ]);
  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 px-6 py-12 text-white sm:px-12 sm:py-16">
        <h1 className="max-w-xl text-3xl font-bold leading-tight sm:text-4xl">Welcome to {settings.storeName}</h1>
        <p className="mt-3 max-w-lg text-brand-50">Quality products delivered to your door anywhere in Pakistan. Pay by card, JazzCash, Easypaisa or bank transfer.</p>
        <Link href="/search" className="mt-6 inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50">Shop now</Link>
      </section>

      {categories.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Shop by category</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {categories.map((c) => (
              <Link key={c.id} href={`/c/${c.slug}`} className="group overflow-hidden rounded-xl border border-gray-200 hover:border-brand-600">
                <div className="relative aspect-[4/3] bg-gray-100">
                  {c.imageUrl && <Image src={c.imageUrl} alt={c.name} fill sizes="200px" className="object-cover" />}
                </div>
                <p className="px-3 py-2 text-sm font-medium group-hover:text-brand-700">{c.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Featured</h2>
          <ProductGrid items={featured} />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">New arrivals</h2>
          <Link href="/search?sort=newest" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>
        </div>
        <ProductGrid items={latest} />
      </section>
    </div>
  );
}
