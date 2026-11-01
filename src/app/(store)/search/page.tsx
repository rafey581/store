import type { Metadata } from "next";
import { listProducts, parseSort } from "@/server/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { SortSelect } from "@/components/store/sort-select";
import { Pagination } from "@/components/ui/pagination";

type Props = { searchParams: Promise<{ q?: string; sort?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q}` : "All products", robots: { index: !q } };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const sort = parseSort(sp.sort);
  const words = q.split(/\s+/).filter(Boolean).slice(0, 6);
  const where = words.length
    ? {
        AND: words.map((w) => ({
          OR: [
            { name: { contains: w, mode: "insensitive" as const } },
            { description: { contains: w, mode: "insensitive" as const } },
            { category: { name: { contains: w, mode: "insensitive" as const } } },
            { variants: { some: { sku: { equals: w, mode: "insensitive" as const } } } },
          ],
        })),
      }
    : {};
  const result = await listProducts({ where, sort, page: Number(sp.page) || 1 });
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{q ? `Results for “${q}”` : "All products"}</h1>
          <p className="text-sm text-gray-500">{result.total} product{result.total === 1 ? "" : "s"}</p>
        </div>
        <SortSelect value={sort} />
      </div>
      <ProductGrid items={result.items} />
      <Pagination page={result.page} pages={result.pages} basePath="/search" params={{ q, sort: sp.sort }} />
    </div>
  );
}
