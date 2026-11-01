import { z } from "zod";
import { db } from "@/server/db";
import { getSettings, type Settings } from "@/server/settings";
import { computePricing, type PricingResult } from "@/lib/pricing";
import { cartLines, couponUsesByEmail, findCoupon, type CartLine } from "@/server/cart";
import { cityKey, karachiDay, normalizePkPhone } from "@/lib/utils";
import { refreshProductAggregates } from "@/server/catalog";
import { STOCK_HELD } from "@/lib/order-status";
import { notifyOrder } from "@/server/notify";
import type { Prisma } from "@/generated/prisma/client";
import type { ActorType, OrderStatus, PaymentMethod } from "@/generated/prisma/enums";

type Tx = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Shipping
// ---------------------------------------------------------------------------

export async function shippingFor(city: string | null | undefined, settings?: Settings) {
  if (!city || !city.trim()) return null;
  const s = settings ?? (await getSettings());
  const rate = await db.shippingRate.findUnique({ where: { cityKey: cityKey(city) } });
  if (rate && rate.isActive) {
    return { feePaisa: rate.feePaisa, freeAbovePaisa: rate.freeShippingAbovePaisa ?? s.freeShippingAbovePaisa, minDays: rate.minDays, maxDays: rate.maxDays, matched: true };
  }
  return { feePaisa: s.defaultShippingPaisa, freeAbovePaisa: s.freeShippingAbovePaisa, minDays: 3, maxDays: 7, matched: false };
}

// ---------------------------------------------------------------------------
// Quote (server-side pricing for a cart)
// ---------------------------------------------------------------------------

export type Quote = PricingResult & { lines: CartLine[]; blocked: string | null; deliveryDays: string | null };

export async function quoteCart(cart: Parameters<typeof cartLines>[0], opts: { city?: string | null; email?: string | null }): Promise<Quote> {
  const lines = cartLines(cart);
  const ok = lines.filter((l) => !l.problem);
  const blocked = lines.length === 0 ? "Your cart is empty." : lines.some((l) => l.problem) ? "Some items in your cart are unavailable. Please update your cart." : null;
  const coupon = await findCoupon(cart?.couponCode);
  const uses = coupon && opts.email ? await couponUsesByEmail(coupon.code, opts.email) : 0;
  const ship = await shippingFor(opts.city);
  const pricing = computePricing({ lines: ok, coupon, customerCouponUses: uses, shipping: ship ? { feePaisa: ship.feePaisa, freeAbovePaisa: ship.freeAbovePaisa } : null });
  return { ...pricing, lines, blocked, deliveryDays: ship ? `${ship.minDays}–${ship.maxDays} working days` : null };
}

// ---------------------------------------------------------------------------
// Checkout input
// ---------------------------------------------------------------------------

export const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  customerName: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z
    .string()
    .trim()
    .transform(normalizePkPhone)
    .refine((v) => /^03\d{9}$/.test(v), "Enter a valid mobile number, e.g. 03001234567"),
  shipLine1: z.string().trim().min(5, "Enter your street address").max(200),
  shipLine2: z.string().trim().max(200).optional().transform((v) => v || null),
  shipCity: z.string().trim().min(2, "Enter your city").max(60),
  shipProvince: z.string().trim().max(60).optional().transform((v) => v || null),
  shipPostalCode: z.string().trim().max(10).optional().transform((v) => v || null),
  customerNote: z.string().trim().max(500).optional().transform((v) => v || null),
  paymentMethod: z.enum(["SAFEPAY", "PAYFAST", "JAZZCASH", "EASYPAISA", "MANUAL_TRANSFER"]),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export class CheckoutError extends Error {}

// ---------------------------------------------------------------------------
// Place order: all amounts computed here, stock reserved atomically.
// ---------------------------------------------------------------------------

export async function placeOrder(opts: { cartId: string; userId: string | null; input: CheckoutInput }) {
  const settings = await getSettings();
  const cart = await db.cart.findUnique({
    where: { id: opts.cartId },
    include: {
      items: {
        include: {
          variant: { include: { image: { select: { url: true } }, product: { select: { id: true, name: true, slug: true, status: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } } } } },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) throw new CheckoutError("Your cart is empty.");
  const q = await quoteCart(cart, { city: opts.input.shipCity, email: opts.input.email });
  if (q.blocked) throw new CheckoutError(q.blocked);
  const couponCode = cart.couponCode && q.couponApplied ? q.couponApplied : null;

  const now = new Date();
  const expiresAt =
    opts.input.paymentMethod === "MANUAL_TRANSFER"
      ? new Date(now.getTime() + settings.manualOrderExpiryHours * 3600_000)
      : new Date(now.getTime() + settings.gatewayOrderExpiryMins * 60_000);

  const order = await db.$transaction(
    async (tx) => {
      // Reserve stock; the WHERE stock >= qty makes overselling impossible.
      for (const l of q.lines) {
        const res = await tx.productVariant.updateMany({ where: { id: l.variantId, isActive: true, stock: { gte: l.quantity } }, data: { stock: { decrement: l.quantity } } });
        if (res.count !== 1) throw new CheckoutError(`Sorry, "${l.productName}${l.variantTitle !== "Default" ? ` (${l.variantTitle})` : ""}" just sold out or has less stock than requested.`);
      }

      let couponId: string | null = null;
      if (couponCode) {
        const rows = await tx.$queryRaw<{ id: string }[]>`
          UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
          WHERE "code" = ${couponCode} AND "isActive" = true AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")
          RETURNING "id"`;
        if (!rows[0]) throw new CheckoutError("This coupon is no longer available. Please remove it and try again.");
        couponId = rows[0].id;
      }

      const created = await tx.order.create({
        data: {
          userId: opts.userId,
          paymentMethod: opts.input.paymentMethod,
          email: opts.input.email,
          customerName: opts.input.customerName,
          phone: opts.input.phone,
          shipLine1: opts.input.shipLine1,
          shipLine2: opts.input.shipLine2,
          shipCity: opts.input.shipCity,
          shipProvince: opts.input.shipProvince,
          shipPostalCode: opts.input.shipPostalCode,
          customerNote: opts.input.customerNote,
          subtotalPaisa: q.subtotalPaisa,
          discountPaisa: q.discountPaisa,
          shippingPaisa: q.shippingPaisa,
          totalPaisa: q.totalPaisa,
          couponCode,
          expiresAt,
          items: {
            create: q.lines.map((l) => ({
              variantId: l.variantId,
              productName: l.productName,
              variantTitle: l.variantTitle,
              sku: l.sku,
              imageUrl: l.imageUrl,
              unitPricePaisa: l.unitPricePaisa,
              quantity: l.quantity,
              lineTotalPaisa: l.lineTotalPaisa,
            })),
          },
          statusEvents: { create: { toStatus: "PENDING_PAYMENT", actorType: "CUSTOMER", actorId: opts.userId, note: "Order placed" } },
        },
        include: { items: true },
      });

      await tx.inventoryMovement.createMany({ data: q.lines.map((l) => ({ variantId: l.variantId, delta: -l.quantity, reason: "ORDER_RESERVED" as const, orderId: created.id })) });
      if (couponId) await tx.couponRedemption.create({ data: { couponId, orderId: created.id, userId: opts.userId, email: opts.input.email } });
      if (opts.input.paymentMethod === "MANUAL_TRANSFER") {
        await tx.payment.create({ data: { orderId: created.id, method: "MANUAL_TRANSFER", status: "PENDING", amountPaisa: created.totalPaisa, reference: `M${created.number}-${Date.now().toString(36)}` } });
      }
      await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null, items: { deleteMany: {} } } });
      await refreshProductAggregates(q.lines.map((l) => l.productId), tx);
      await tx.dailyStat.upsert({ where: { date: karachiDay(now) }, update: { orders: { increment: 1 } }, create: { date: karachiDay(now), orders: 1 } });
      return created;
    },
    { timeout: 20000 },
  );
  return order;
}

// ---------------------------------------------------------------------------
// Stock release (expiry / cancellation)
// ---------------------------------------------------------------------------

export async function releaseStock(tx: Tx, orderId: string, actorId: string | null, note: string) {
  const items = await tx.orderItem.findMany({ where: { orderId, variantId: { not: null } }, include: { variant: { select: { productId: true } } } });
  for (const it of items) {
    if (!it.variantId) continue;
    await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
    await tx.inventoryMovement.create({ data: { variantId: it.variantId, delta: it.quantity, reason: "ORDER_RELEASED", orderId, actorId, note } });
  }
  await refreshProductAggregates(items.map((i) => i.variant!.productId), tx);
}

/** Re-reserves stock for an order that had released it (e.g. paid after expiry). Returns false if stock ran out. */
export async function reReserveStock(tx: Tx, orderId: string): Promise<boolean> {
  const items = await tx.orderItem.findMany({ where: { orderId }, include: { variant: { select: { productId: true } } } });
  for (const it of items) {
    if (!it.variantId) return false;
    const res = await tx.productVariant.updateMany({ where: { id: it.variantId, stock: { gte: it.quantity } }, data: { stock: { decrement: it.quantity } } });
    if (res.count !== 1) return false;
    await tx.inventoryMovement.create({ data: { variantId: it.variantId, delta: -it.quantity, reason: "ORDER_RESERVED", orderId, note: "Re-reserved after late payment" } });
  }
  await refreshProductAggregates(items.filter((i) => i.variant).map((i) => i.variant!.productId), tx);
  return true;
}

export async function releaseCoupon(tx: Tx, orderId: string) {
  const red = await tx.couponRedemption.findUnique({ where: { orderId } });
  if (!red) return;
  await tx.couponRedemption.delete({ where: { id: red.id } });
  await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE "id" = ${red.couponId}`;
}

export async function addEvent(tx: Tx, orderId: string, from: OrderStatus | null, to: OrderStatus, actorType: ActorType, actorId: string | null, note?: string | null, isPublic = true) {
  await tx.orderStatusEvent.create({ data: { orderId, fromStatus: from, toStatus: to, actorType, actorId, note: note ?? null, isPublic } });
}

// ---------------------------------------------------------------------------
// Expiry: unpaid orders past expiresAt -> EXPIRED, stock and coupon released.
// Runs from the cron route and opportunistically from admin pages.
// ---------------------------------------------------------------------------

export async function expireDueOrders(limit = 100): Promise<number[]> {
  const due = await db.order.findMany({ where: { status: "PENDING_PAYMENT", expiresAt: { lt: new Date() } }, select: { id: true, number: true }, take: limit, orderBy: { expiresAt: "asc" } });
  const expired: number[] = [];
  for (const o of due) {
    const done = await db.$transaction(async (tx) => {
      const res = await tx.order.updateMany({ where: { id: o.id, status: "PENDING_PAYMENT", expiresAt: { lt: new Date() } }, data: { status: "EXPIRED", cancelledAt: new Date() } });
      if (res.count !== 1) return false; // paid or changed meanwhile
      await releaseStock(tx, o.id, null, "Order expired unpaid");
      await releaseCoupon(tx, o.id);
      await tx.payment.updateMany({ where: { orderId: o.id, status: { in: ["INITIATED", "PENDING"] } }, data: { status: "EXPIRED" } });
      await addEvent(tx, o.id, "PENDING_PAYMENT", "EXPIRED", "SYSTEM", null, "Payment not received in time. Items released.");
      return true;
    });
    if (done) {
      expired.push(o.number);
      await notifyOrder(o.id, "status", { status: "EXPIRED", note: "We did not receive payment in time, so the order was cancelled. You are welcome to order again." });
    }
  }
  return expired;
}

export const STOCK_HELD_STATUSES = STOCK_HELD;

export function methodLabel(m: PaymentMethod): string {
  return { SAFEPAY: "Card (Safepay)", PAYFAST: "Card (PayFast)", JAZZCASH: "JazzCash", EASYPAISA: "Easypaisa", MANUAL_TRANSFER: "Bank / wallet transfer" }[m];
}
