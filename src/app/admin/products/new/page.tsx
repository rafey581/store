import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { ProductEditor } from "@/components/admin/product-editor";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireStaff("products");
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div>
      <PageHeader title="New product" />
      <ProductEditor categories={categories} initial={{ name: "", slug: "", description: "", status: "DRAFT", categoryId: null, isFeatured: false, seoTitle: "", seoDescription: "", images: [], options: [], variants: [] }} />
    </div>
  );
}
