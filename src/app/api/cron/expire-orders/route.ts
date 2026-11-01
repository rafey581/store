import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { expireDueOrders } from "@/server/orders";
import { reconcilePayment } from "@/server/payments";

// Called by Vercel Cron (Authorization: Bearer $CRON_SECRET) or any external scheduler.
// 1) asks gateways about recent pending attempts (missed callbacks), 2) expires unpaid orders.
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") || "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pending = await db.payment.findMany({ where: { status: "PENDING", method: { notIn: ["MANUAL_TRANSFER", "COD"] }, createdAt: { gte: new Date(Date.now() - 48 * 3600_000) } }, select: { id: true }, take: 50 });
  let reconciled = 0;
  for (const p of pending) if ((await reconcilePayment(p.id)) === "applied") reconciled++;
  const expired = await expireDueOrders(200);
  // Housekeeping: abandoned guest carts, old rate-limit rows, used/expired reset tokens.
  const cleaned = await db.cart.deleteMany({ where: { userId: null, updatedAt: { lt: new Date(Date.now() - 30 * 86400_000) } } });
  await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
  await db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400_000) } } });
  return NextResponse.json({ expired: expired.length, reconciled, cartsCleaned: cleaned.count });
}
