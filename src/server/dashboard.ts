import { db } from "@/server/db";
import { getSettings } from "@/server/settings";
import { karachiDay } from "@/lib/utils";

const PAID_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export async function getDashboardStats() {
  const settings = await getSettings();
  const now = new Date();
  const today = karachiDay(now);
  // Start of today in Pakistan (UTC+5) as an instant.
  const todayStart = new Date(today.getTime() - 5 * 3600_000);
  const d7 = new Date(todayStart.getTime() - 6 * 86400_000);
  const d30 = new Date(todayStart.getTime() - 29 * 86400_000);
  const paid = { paymentStatus: "PAID" as const, status: { in: [...PAID_STATUSES] } };

  const [salesToday, sales7, sales30, ordersToday, pendingPayment, pendingProofs, toShip, lowStock, totalVisitors, liveVisitors, todayStat, recentOrders, daily] = await Promise.all([
    db.order.aggregate({ where: { ...paid, paidAt: { gte: todayStart } }, _sum: { totalPaisa: true }, _count: true }),
    db.order.aggregate({ where: { ...paid, paidAt: { gte: d7 } }, _sum: { totalPaisa: true }, _count: true }),
    db.order.aggregate({ where: { ...paid, paidAt: { gte: d30 } }, _sum: { totalPaisa: true }, _count: true }),
    db.order.count({ where: { createdAt: { gte: todayStart } } }),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.paymentProof.count({ where: { status: "PENDING" } }),
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    db.$queryRaw<{ id: string; sku: string; title: string; stock: number; productId: string; productName: string }[]>`
      SELECT v."id", v."sku", v."title", v."stock", p."id" AS "productId", p."name" AS "productName"
      FROM "ProductVariant" v JOIN "Product" p ON p."id" = v."productId"
      WHERE v."isActive" = true AND p."status" = 'ACTIVE' AND v."stock" <= COALESCE(v."lowStockThreshold", ${settings.lowStockThreshold})
      ORDER BY v."stock" ASC LIMIT 20`,
    db.visitor.count(),
    db.visitor.count({ where: { lastSeenAt: { gte: new Date(now.getTime() - 5 * 60_000) } } }),
    db.dailyStat.findUnique({ where: { date: today } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, number: true, customerName: true, totalPaisa: true, status: true, createdAt: true } }),
    db.dailyStat.findMany({ where: { date: { gte: new Date(today.getTime() - 13 * 86400_000) } }, orderBy: { date: "asc" } }),
  ]);

  const chart = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today.getTime() - (13 - i) * 86400_000);
    const row = daily.find((r) => r.date.getTime() === d.getTime());
    return { date: d.toISOString().slice(0, 10), revenuePaisa: row?.revenuePaisa ?? 0, orders: row?.orders ?? 0, visitors: row?.visitors ?? 0 };
  });

  return {
    sales: {
      todayPaisa: salesToday._sum.totalPaisa ?? 0,
      todayCount: salesToday._count,
      last7Paisa: sales7._sum.totalPaisa ?? 0,
      last7Count: sales7._count,
      last30Paisa: sales30._sum.totalPaisa ?? 0,
      last30Count: sales30._count,
    },
    ordersToday,
    pendingPayment,
    pendingProofs,
    toShip,
    lowStock,
    visitors: { total: totalVisitors, live: liveVisitors, today: todayStat?.visitors ?? 0, pageViewsToday: todayStat?.pageViews ?? 0 },
    recentOrders,
    chart,
  };
}
