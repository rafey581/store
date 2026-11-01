"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { putObject, readImageFile } from "@/server/storage";
import { slugify } from "@/lib/utils";
import { audit } from "@/server/audit";
import type { ActionState } from "@/components/ui/form-message";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name required").max(80),
  slug: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  parentId: z.string().optional(),
  sortOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
  isActive: z.string().optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
});

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff("products");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const slug = slugify(d.slug || d.name);
  if (!slug) return { error: "Invalid slug" };
  const clash = await db.category.findFirst({ where: { slug, NOT: d.id ? { id: d.id } : undefined } });
  if (clash) return { error: "Another category uses this slug." };
  if (d.id && d.parentId === d.id) return { error: "A category cannot be its own parent." };

  let imageUrl: string | undefined;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      const img = await readImageFile(file);
      imageUrl = (await putObject("public", "categories", img.buffer, img.contentType, img.ext)).url!;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Upload failed" };
    }
  }
  const data = {
    name: d.name,
    slug,
    description: d.description || null,
    parentId: d.parentId || null,
    sortOrder: d.sortOrder,
    isActive: d.isActive === "on",
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
    ...(imageUrl ? { imageUrl } : {}),
  };
  const cat = d.id ? await db.category.update({ where: { id: d.id }, data }) : await db.category.create({ data });
  await audit(user.id, d.id ? "category.update" : "category.create", "Category", cat.id, { name: cat.name });
  revalidatePath("/", "layout");
  return { ok: d.id ? "Category updated." : "Category created." };
}

export async function deleteCategory(formData: FormData) {
  const user = await requireStaff("products");
  const id = String(formData.get("id") ?? "");
  await db.category.delete({ where: { id } }).catch(() => null);
  await audit(user.id, "category.delete", "Category", id);
  revalidatePath("/", "layout");
}
