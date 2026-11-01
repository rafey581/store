import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { listProducts, parseSort } from "@/server/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { SortSelect } from "@/components/store/sort-select";
import { Pagination } from "@/components/ui/pagination";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string; page?: string }> };

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
  const result = await listProducts({ where: { categoryId: { in: ids } }, sort, page: Number(sp.page) || 1 });
  return (
    <div>
      <nav className="mb-3 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">Home</Link>
        {category.parent && <> / <Link href={`/c/${category.parent.slug}`} className="hover:underline">{category.parent.name}</Link></>}
        {" / "}<span className="text-gray-900">{category.name}</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{category.name}</h1>
          {category.description && <p className="mt-1 max-w-2xl text-sm text-gray-600">{category.description}</p>}
        </div>
        <SortSelect value={sort} />
      </div>
      {category.children.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {category.children.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="rounded-full border px-3 py-1 text-sm hover:border-brand-600 hover:text-brand-700">{c.name}</Link>
          ))}
        </div>
      )}
      <ProductGrid items={result.items} />
      <Pagination page={result.page} pages={result.pages} basePath={`/c/${slug}`} params={{ sort: sp.sort }} />
    </div>
  );
}
