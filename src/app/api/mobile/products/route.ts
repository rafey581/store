import { db } from "@/server/db";
import { requireMobileStaff, json } from "@/server/mobile-api";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: Request) {
  const u = await requireMobileStaff(req, "products");
  if (u instanceof Response) return u;
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 80);
  const where: Prisma.ProductWhereInput = q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q, mode: "insensitive" } } } }] } : {};
  if (sp.get("lowStock") === "1") where.totalStock = { lte: 5 };
  const items = await db.product.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, name: true, status: true, minPricePaisa: true, maxPricePaisa: true, totalStock: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
  });
  return json({ items: items.map(({ images, ...p }) => ({ ...p, imageUrl: images[0]?.url ?? null })) });
}
