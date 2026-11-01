import { db } from "@/server/db";
import { requireMobileStaff, json } from "@/server/mobile-api";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { normalizePkPhone } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export async function GET(req: Request) {
  const u = await requireMobileStaff(req, "orders");
  if (u instanceof Response) return u;
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") ?? "";
  const q = (sp.get("q") ?? "").trim().slice(0, 80);
  const cursor = sp.get("cursor");
  const where: Prisma.OrderWhereInput = {};
  if (status === "TO_SHIP") where.status = { in: ["PAID", "PROCESSING"] };
  else if (STATUSES.includes(status as OrderStatus)) where.status = status as OrderStatus;
  if (q) {
    const n = Number(q.replace(/^#/, ""));
    where.OR = [
      ...(Number.isInteger(n) && n > 0 && n < 2e9 ? [{ number: n }] : []),
      { customerName: { contains: q, mode: "insensitive" } },
      { email: { contains: q.toLowerCase() } },
      { phone: { contains: normalizePkPhone(q) || q } },
    ];
  }
  const take = 30;
  const rows = await db.order.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, number: true, customerName: true, shipCity: true, totalPaisa: true, status: true, paymentStatus: true, paymentMethod: true, createdAt: true },
  });
  const hasMore = rows.length > take;
  const items = rows.slice(0, take);
  return json({ items, nextCursor: hasMore ? items[items.length - 1].id : null });
}
