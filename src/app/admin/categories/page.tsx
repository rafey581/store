import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { CategoryForm } from "@/components/admin/category-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteCategory } from "./actions";
import { cardCls } from "@/components/ui/styles";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireStaff("products");
  const cats = await db.category.findMany({ orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } }, parent: { select: { name: true } } } });
  const parents = cats.filter((c) => !c.parentId).map((c) => ({ id: c.id, name: c.name }));
  return (
    <div className="space-y-6">
      <PageHeader title="Categories" />
      <section className={`${cardCls} p-5`}>
        <h2 className="mb-3 font-semibold">Add category</h2>
        <CategoryForm parents={parents} />
      </section>
      <div className="space-y-3">
        {cats.map((c) => (
          <details key={c.id} className={`${cardCls} p-4`}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{c.parent ? `${c.parent.name} › ` : ""}{c.name} <span className="text-sm font-normal text-gray-500">/c/{c.slug} · {c._count.products} products{c.isActive ? "" : " · hidden"}</span></span>
              <span className="text-sm text-brand-700">Edit</span>
            </summary>
            <div className="mt-4 border-t pt-4">
              <CategoryForm cat={c} parents={parents} />
              <form action={deleteCategory} className="mt-3">
                <input type="hidden" name="id" value={c.id} />
                <ConfirmButton message="Delete this category? Products in it will become uncategorized." className="text-sm text-red-600 hover:underline">Delete category</ConfirmButton>
              </form>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
