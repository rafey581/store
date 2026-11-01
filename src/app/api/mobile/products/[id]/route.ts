import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireMobileStaff, json, apiError, readJson } from "@/server/mobile-api";
import { audit } from "@/server/audit";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireMobileStaff(req, "products");
  if (u instanceof Response) return u;
  const { id } = await params;
  const p = await db.product.findUnique({
    where: { id },
    select: {
      id: true, name: true, slug: true, status: true, totalStock: true,
      images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
      variants: { orderBy: { position: "asc" }, select: { id: true, title: true, sku: true, pricePaisa: true, compareAtPricePaisa: true, stock: true, isActive: true } },
    },
  });
  if (!p) return apiError("Not found", 404);
  const { images, ...rest } = p;
  return json({ ...rest, imageUrl: images[0]?.url ?? null });
}

// Quick edit: product status only (full editing stays in the web admin).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireMobileStaff(req, "products");
  if (u instanceof Response) return u;
  const { id } = await params;
  const parsed = z.object({ status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]) }).safeParse(await readJson(req));
  if (!parsed.success) return apiError("Invalid status");
  const r = await db.product.updateMany({ where: { id }, data: { status: parsed.data.status } });
  if (!r.count) return apiError("Not found", 404);
  await audit(u.id, "product.status", "Product", id, { status: parsed.data.status, via: "mobile" });
  revalidatePath("/", "layout");
  return json({ ok: true });
}
