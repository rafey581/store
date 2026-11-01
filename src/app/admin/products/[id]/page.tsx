import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { ProductEditor } from "@/components/admin/product-editor";
import { deleteProduct } from "../actions";
import { ConfirmButton } from "@/components/admin/confirm-button";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("products");
  const { id } = await params;
  const [p, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" } },
        options: { orderBy: { position: "asc" }, include: { values: { orderBy: { position: "asc" } } } },
        variants: { orderBy: { position: "asc" }, include: { optionValues: { include: { optionValue: { include: { option: true } } } }, image: true } },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!p) notFound();
  const optionOrder = p.options.map((o) => o.id);
  return (
    <div>
      <PageHeader
        title={p.name}
        actions={
          <>
            {p.status === "ACTIVE" && <Link href={`/p/${p.slug}`} target="_blank" className="rounded-lg border bg-white px-4 py-2 text-sm">View in store</Link>}
            <form action={deleteProduct}>
              <input type="hidden" name="id" value={p.id} />
              <ConfirmButton message="Delete this product permanently? Past orders keep their details. Consider archiving instead.">Delete</ConfirmButton>
            </form>
          </>
        }
      />
      <ProductEditor
        categories={categories}
        initial={{
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          status: p.status,
          categoryId: p.categoryId,
          isFeatured: p.isFeatured,
          seoTitle: p.seoTitle ?? "",
          seoDescription: p.seoDescription ?? "",
          images: p.images.map((i) => ({ id: i.id, url: i.url, key: i.storageKey, alt: i.alt ?? "" })),
          options: p.options.map((o) => ({ name: o.name, values: o.values.map((v) => v.value) })),
          variants: p.variants.map((v) => ({
            id: v.id,
            options: [...v.optionValues].sort((a, b) => optionOrder.indexOf(a.optionValue.optionId) - optionOrder.indexOf(b.optionValue.optionId)).map((ov) => ov.optionValue.value),
            sku: v.sku,
            pricePaisa: v.pricePaisa,
            compareAtPricePaisa: v.compareAtPricePaisa,
            costPaisa: v.costPaisa,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold,
            weightGrams: v.weightGrams,
            isActive: v.isActive,
            imageKey: v.image?.storageKey ?? null,
          })),
        }}
      />
    </div>
  );
}
