import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { can } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";
import { methodLabel } from "@/server/orders";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";

// Orders CSV for accounting / courier booking. Dates are Pakistan days (from/to inclusive, YYYY-MM-DD).
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "orders")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  const where: Prisma.OrderWhereInput = {};
  const status = sp.get("status");
  if (status === "TO_SHIP") where.status = { in: ["PAID", "PROCESSING"] };
  else if (status && status in ORDER_STATUS_LABEL) where.status = status as OrderStatus;
  const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const from = day(sp.get("from"));
  const to = day(sp.get("to"));
  if (from || to) where.createdAt = { ...(from ? { gte: new Date(`${from}T00:00:00+05:00`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999+05:00`) } : {}) };
  const orders = await db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 10000, include: { items: { select: { productName: true, variantTitle: true, quantity: true } } } });
  const rupees = (p: number) => (p / 100).toFixed(2);
  const rows: unknown[][] = [["Order", "Date (PKT)", "Status", "Payment status", "Payment method", "Customer", "Phone", "Email", "Address", "City", "Province", "Items", "Subtotal", "Discount", "Shipping", "COD fee", "Total", "Courier", "Tracking"]];
  for (const o of orders) {
    rows.push([
      o.number,
      new Date(o.createdAt.getTime() + 5 * 3600_000).toISOString().replace("T", " ").slice(0, 16),
      ORDER_STATUS_LABEL[o.status],
      o.paymentStatus,
      methodLabel(o.paymentMethod),
      o.customerName,
      o.phone,
      o.email,
      [o.shipLine1, o.shipLine2].filter(Boolean).join(", "),
      o.shipCity,
      o.shipProvince ?? "",
      o.items.map((i) => `${i.productName}${i.variantTitle !== "Default" ? ` (${i.variantTitle})` : ""} x${i.quantity}`).join("; "),
      rupees(o.subtotalPaisa),
      rupees(o.discountPaisa),
      rupees(o.shippingPaisa),
      rupees(o.codFeePaisa),
      rupees(o.totalPaisa),
      o.courierName ?? "",
      o.trackingNumber ?? "",
    ]);
  }
  const name = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse("﻿" + toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
}
