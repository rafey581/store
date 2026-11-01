import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { listProducts, parseSort } from "@/server/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { FilterBar } from "@/components/store/filter-bar";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { Pagination } from "@/components/ui/pagination";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string; page?: string; min?: string; max?: string; inStock?: string }> };

async function getCategory(slug: string) {
  return db.category.findFirst({
    where: { slug, isActive: true },
    include: { children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } }, parent: { select: { name: true, slug: true } } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  if (!c) return {};
  return { title: c.seoTitle || c.name, description: c.seoDescription || c.description || `Shop ${c.name} online in Pakistan.`, alternates: { canonical: `/c/${c.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategory(slug);
  if (!category) notFound();
  const sort = parseSort(sp.sort);
  const ids = [category.id, ...category.children.map((c) => c.id)];
  const result = await listProducts({ where: { categoryId: { in: ids } }, sort, page: Number(sp.page) || 1, filters: sp });
  return (
    <div>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, ...(category.parent ? [{ label: category.parent.name, href: `/c/${category.parent.slug}` }] : []), { label: category.name }]} />
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-hero px-6 py-10 sm:px-10">
        <div className="bg-dots absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{category.name}</h1>
          {category.description && <p className="mt-2 max-w-2xl text-gray-300">{category.description}</p>}
          <p className="mt-3 text-sm font-medium text-brand-300">{result.total} product{result.total === 1 ? "" : "s"}</p>
        </div>
      </div>
      {category.children.length > 0 && (
        <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
          {category.children.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:border-ink-900">{c.name}</Link>
          ))}
        </div>
      )}
      <FilterBar action={`/c/${slug}`} params={sp} sort={sort} />
      <ProductGrid items={result.items} />
      <Pagination page={result.page} pages={result.pages} basePath={`/c/${slug}`} params={{ sort: sp.sort, min: sp.min, max: sp.max, inStock: sp.inStock }} />
    </div>
  );
}
