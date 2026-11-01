import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireMobileStaff, json, apiError, readJson } from "@/server/mobile-api";
import { refreshProductAggregates } from "@/server/catalog";
import { audit } from "@/server/audit";

const schema = z
  .object({
    pricePaisa: z.number().int().min(0).max(2_000_000_000).optional(),
    compareAtPricePaisa: z.number().int().min(0).max(2_000_000_000).nullable().optional(),
    stock: z.number().int().min(0).max(1_000_000).optional(),
    // Optimistic check: the stock the app showed. If an order changed it meanwhile, the edit is refused.
    expectedStock: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.stock === undefined || d.expectedStock !== undefined, { message: "expectedStock is required when changing stock" });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireMobileStaff(req, "products");
  if (u instanceof Response) return u;
  const { id } = await params;
  const parsed = schema.safeParse(await readJson(req));
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  const v = await db.productVariant.findUnique({ where: { id } });
  if (!v) return apiError("Not found", 404);
  const price = d.pricePaisa ?? v.pricePaisa;
  const compare = d.compareAtPricePaisa === undefined ? v.compareAtPricePaisa : d.compareAtPricePaisa;
  if (compare !== null && compare <= price) return apiError("Compare-at price must be higher than the price.");

  const result = await db.$transaction(async (tx) => {
    if (d.stock !== undefined) {
      const r = await tx.productVariant.updateMany({ where: { id, stock: d.expectedStock }, data: { stock: d.stock } });
      if (r.count !== 1) return "conflict" as const;
      if (d.stock !== d.expectedStock) await tx.inventoryMovement.create({ data: { variantId: id, delta: d.stock - d.expectedStock!, reason: "ADMIN_ADJUST", actorId: u.id, note: "Mobile quick edit" } });
    }
    await tx.productVariant.update({ where: { id }, data: { pricePaisa: price, compareAtPricePaisa: compare, ...(d.isActive !== undefined ? { isActive: d.isActive } : {}) } });
    await refreshProductAggregates([v.productId], tx);
    return "ok" as const;
  });
  if (result === "conflict") return apiError("Stock changed since you opened this product (an order may have been placed). Refresh and try again.", 409);
  await audit(u.id, "variant.quick_edit", "ProductVariant", id, { ...d, via: "mobile" });
  revalidatePath("/", "layout");
  const updated = await db.productVariant.findUnique({ where: { id }, select: { id: true, title: true, sku: true, pricePaisa: true, compareAtPricePaisa: true, stock: true, isActive: true } });
  return json(updated);
}
