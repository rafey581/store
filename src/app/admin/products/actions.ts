"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { productInput } from "@/lib/validation/product";
import { refreshProductAggregates } from "@/server/catalog";
import { deleteObject } from "@/server/storage";
import { audit } from "@/server/audit";
import { Prisma } from "@/generated/prisma/client";

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

function allowedImageUrl(url: string) {
  const supa = process.env.SUPABASE_URL?.replace(/\/$/, "");
  return url.startsWith("/media/") || (supa ? url.startsWith(`${supa}/storage/v1/object/public/`) : false);
}

export async function saveProduct(raw: unknown): Promise<SaveResult> {
  const user = await requireStaff("products");
  const parsed = productInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product data" };
  const p = parsed.data;
  if (p.images.some((i) => !allowedImageUrl(i.url))) return { ok: false, error: "Images must be uploaded through the admin panel." };

  const slugTaken = await db.product.findFirst({ where: { slug: p.slug, NOT: p.id ? { id: p.id } : undefined }, select: { id: true } });
  if (slugTaken) return { ok: false, error: "Another product already uses this URL slug." };
  if (p.categoryId && !(await db.category.findUnique({ where: { id: p.categoryId }, select: { id: true } }))) return { ok: false, error: "Category not found." };

  const removedImageKeys: string[] = [];
  let productId = p.id ?? "";
  try {
    await db.$transaction(
      async (tx) => {
        const base = { name: p.name, slug: p.slug, description: p.description, status: p.status, categoryId: p.categoryId, isFeatured: p.isFeatured, seoTitle: p.seoTitle, seoDescription: p.seoDescription };
        if (p.id) {
          const existing = await tx.product.findUnique({ where: { id: p.id }, select: { id: true } });
          if (!existing) throw new Error("Product not found.");
          await tx.product.update({ where: { id: p.id }, data: base });
        } else {
          productId = (await tx.product.create({ data: base, select: { id: true } })).id;
        }

        // Images
        const existingImages = await tx.productImage.findMany({ where: { productId } });
        const inputKeys = new Set(p.images.map((i) => i.key));
        for (const img of existingImages) {
          if (!inputKeys.has(img.storageKey)) {
            removedImageKeys.push(img.storageKey);
            await tx.productImage.delete({ where: { id: img.id } });
          }
        }
        const imageIdByKey = new Map<string, string>();
        for (const [position, img] of p.images.entries()) {
          const found = existingImages.find((e) => e.storageKey === img.key);
          if (found) {
            await tx.productImage.update({ where: { id: found.id }, data: { position, alt: img.alt } });
            imageIdByKey.set(img.key, found.id);
          } else {
            const created = await tx.productImage.create({ data: { productId, url: img.url, storageKey: img.key, alt: img.alt, position } });
            imageIdByKey.set(img.key, created.id);
          }
        }

        // Options (rebuilt each save; variant links are re-created below)
        await tx.productOption.deleteMany({ where: { productId } });
        const valueIds: Map<string, string>[] = [];
        for (const [position, o] of p.options.entries()) {
          const opt = await tx.productOption.create({
            data: { productId, name: o.name, position, values: { create: o.values.map((value, vp) => ({ value, position: vp })) } },
            include: { values: true },
          });
          valueIds.push(new Map(opt.values.map((v) => [v.value, v.id])));
        }

        // Variants
        const existingVariants = await tx.productVariant.findMany({ where: { productId }, select: { id: true, stock: true } });
        const keepIds = new Set<string>();
        for (const [position, v] of p.variants.entries()) {
          const title = v.options.length ? v.options.join(" / ") : "Default";
          const data = {
            sku: v.sku,
            title,
            pricePaisa: v.pricePaisa,
            compareAtPricePaisa: v.compareAtPricePaisa,
            costPaisa: v.costPaisa,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold,
            weightGrams: v.weightGrams,
            isActive: v.isActive,
            position,
            imageId: v.imageKey ? imageIdByKey.get(v.imageKey) ?? null : null,
          };
          const prev = v.id ? existingVariants.find((e) => e.id === v.id) : undefined;
          let variantId: string;
          if (prev) {
            await tx.productVariant.update({ where: { id: prev.id }, data });
            variantId = prev.id;
            if (prev.stock !== v.stock) await tx.inventoryMovement.create({ data: { variantId, delta: v.stock - prev.stock, reason: "ADMIN_ADJUST", actorId: user.id } });
          } else {
            variantId = (await tx.productVariant.create({ data: { ...data, productId } })).id;
            if (v.stock) await tx.inventoryMovement.create({ data: { variantId, delta: v.stock, reason: "ADMIN_ADJUST", actorId: user.id, note: "Initial stock" } });
          }
          keepIds.add(variantId);
          if (v.options.length) {
            await tx.variantOptionValue.createMany({ data: v.options.map((val, j) => ({ variantId, optionValueId: valueIds[j].get(val)! })) });
          }
        }
        const toDelete = existingVariants.filter((e) => !keepIds.has(e.id)).map((e) => e.id);
        if (toDelete.length) await tx.productVariant.deleteMany({ where: { id: { in: toDelete } } });

        await refreshProductAggregates([productId], tx);
      },
      { timeout: 20000 },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: `Duplicate value: ${String((e.meta as { target?: unknown })?.target ?? "SKU or slug")} is already used by another product.` };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Could not save product." };
  }
  for (const key of removedImageKeys) await deleteObject("public", key);
  await audit(user.id, p.id ? "product.update" : "product.create", "Product", productId, { name: p.name });
  revalidatePath("/", "layout");
  return { ok: true, id: productId };
}

export async function deleteProduct(formData: FormData) {
  const user = await requireStaff("products");
  const id = String(formData.get("id") ?? "");
  const product = await db.product.findUnique({ where: { id }, include: { images: true } });
  if (!product) redirect("/admin/products");
  await db.product.delete({ where: { id } });
  for (const img of product.images) await deleteObject("public", img.storageKey);
  await audit(user.id, "product.delete", "Product", id, { name: product.name });
  revalidatePath("/", "layout");
  redirect("/admin/products");
}
