import { cache } from "react";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  minPricePaisa: true,
  maxPricePaisa: true,
  totalStock: true,
  images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
  variants: { where: { isActive: true }, orderBy: { position: "asc" }, take: 1, select: { compareAtPricePaisa: true, pricePaisa: true } },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export const SORTS = {
  newest: { createdAt: "desc" },
  "price-asc": { minPricePaisa: "asc" },
  "price-desc": { minPricePaisa: "desc" },
  name: { name: "asc" },
} as const satisfies Record<string, Prisma.ProductOrderByWithRelationInput>;
export type SortKey = keyof typeof SORTS;

export function parseSort(s: string | undefined): SortKey {
  return s && s in SORTS ? (s as SortKey) : "newest";
}

export const PAGE_SIZE = 24;

export async function listProducts(opts: { where?: Prisma.ProductWhereInput; sort?: SortKey; page?: number }) {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE", ...(opts.where ?? {}) };
  const page = Math.max(1, opts.page ?? 1);
  const [items, total] = await Promise.all([
    db.product.findMany({ where, orderBy: SORTS[opts.sort ?? "newest"], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: productCardSelect }),
    db.product.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export const getNavCategories = cache(async () =>
  db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, imageUrl: true, children: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } } },
  }),
);

export const getProductBySlug = cache(async (slug: string) =>
  db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { position: "asc" } },
      options: { orderBy: { position: "asc" }, include: { values: { orderBy: { position: "asc" } } } },
      variants: {
        where: { isActive: true },
        orderBy: { position: "asc" },
        include: { optionValues: { include: { optionValue: { select: { id: true, optionId: true, value: true } } } } },
      },
    },
  }),
);

/** Recomputes the denormalized price range and stock total on a product. */
export async function refreshProductAggregates(productIds: string[], tx: Prisma.TransactionClient | typeof db = db) {
  for (const id of new Set(productIds)) {
    const variants = await tx.productVariant.findMany({ where: { productId: id, isActive: true }, select: { pricePaisa: true, stock: true } });
    const prices = variants.map((v) => v.pricePaisa);
    await tx.product.update({
      where: { id },
      data: {
        minPricePaisa: prices.length ? Math.min(...prices) : 0,
        maxPricePaisa: prices.length ? Math.max(...prices) : 0,
        totalStock: variants.reduce((s, v) => s + v.stock, 0),
      },
    });
  }
}
