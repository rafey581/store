import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { auth } from "@/auth";
import type { PricingCoupon } from "@/lib/pricing";

const CART_COOKIE = "cart_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 60;

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      variant: {
        include: {
          image: { select: { url: true } },
          product: { select: { id: true, name: true, slug: true, status: true, images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } } } },
        },
      },
    },
  },
};

async function sessionUserId(): Promise<string | null> {
  const s = await auth();
  return s?.user?.id ?? null;
}

/** Read-only lookup, safe in Server Components (never sets cookies). */
export async function findCart() {
  const userId = await sessionUserId();
  if (userId) return db.cart.findUnique({ where: { userId }, include: cartInclude });
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  return db.cart.findUnique({ where: { guestToken: token }, include: cartInclude });
}

/** For Server Actions only: returns the cart, creating it (and the cookie) if needed. */
export async function getOrCreateCartId(): Promise<string> {
  const userId = await sessionUserId();
  if (userId) {
    const c = await db.cart.upsert({ where: { userId }, update: {}, create: { userId }, select: { id: true } });
    return c.id;
  }
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (token) {
    const c = await db.cart.findUnique({ where: { guestToken: token }, select: { id: true } });
    if (c) return c.id;
  }
  const newToken = randomBytes(24).toString("base64url");
  const c = await db.cart.create({ data: { guestToken: newToken }, select: { id: true } });
  jar.set(CART_COOKIE, newToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: COOKIE_MAX_AGE });
  return c.id;
}

/** After login: move guest cart items into the user's cart. Server Actions only. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return;
  const guest = await db.cart.findUnique({ where: { guestToken: token }, include: { items: true } });
  jar.delete(CART_COOKIE);
  if (!guest) return;
  const userCart = await db.cart.upsert({ where: { userId }, update: {}, create: { userId } });
  if (guest.id === userCart.id) return;
  await db.$transaction(async (tx) => {
    for (const it of guest.items) {
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId: it.variantId } },
        update: { quantity: { increment: it.quantity } },
        create: { cartId: userCart.id, variantId: it.variantId, quantity: it.quantity },
      });
    }
    if (guest.couponCode && !userCart.couponCode) await tx.cart.update({ where: { id: userCart.id }, data: { couponCode: guest.couponCode } });
    await tx.cart.delete({ where: { id: guest.id } });
  });
}

export async function clearCart(cartId: string) {
  await db.cart.update({ where: { id: cartId }, data: { couponCode: null, items: { deleteMany: {} } } });
}

type CartWithItems = NonNullable<Awaited<ReturnType<typeof findCart>>>;

export type CartLine = {
  itemId: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantTitle: string;
  sku: string;
  imageUrl: string | null;
  unitPricePaisa: number;
  quantity: number;
  stock: number;
  lineTotalPaisa: number;
  problem: string | null; // unavailable / not enough stock
};

export function cartLines(cart: CartWithItems | null): CartLine[] {
  if (!cart) return [];
  return cart.items.map((it) => {
    const v = it.variant;
    const p = v.product;
    let problem: string | null = null;
    if (p.status !== "ACTIVE" || !v.isActive) problem = "No longer available";
    else if (v.stock <= 0) problem = "Out of stock";
    else if (it.quantity > v.stock) problem = `Only ${v.stock} left`;
    return {
      itemId: it.id,
      variantId: v.id,
      productId: p.id,
      productName: p.name,
      productSlug: p.slug,
      variantTitle: v.title,
      sku: v.sku,
      imageUrl: v.image?.url ?? p.images[0]?.url ?? null,
      unitPricePaisa: v.pricePaisa,
      quantity: it.quantity,
      stock: v.stock,
      lineTotalPaisa: v.pricePaisa * it.quantity,
      problem,
    };
  });
}

export async function cartCount(): Promise<number> {
  const cart = await findCart();
  return cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
}

export async function findCoupon(code: string | null | undefined): Promise<PricingCoupon | null> {
  if (!code) return null;
  const c = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!c) return null;
  return {
    code: c.code,
    type: c.type,
    value: c.value,
    minSubtotalPaisa: c.minSubtotalPaisa,
    maxDiscountPaisa: c.maxDiscountPaisa,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    usageLimit: c.usageLimit,
    perCustomerLimit: c.perCustomerLimit,
    usedCount: c.usedCount,
    isActive: c.isActive,
  };
}

export async function couponUsesByEmail(code: string, email: string): Promise<number> {
  return db.couponRedemption.count({ where: { coupon: { code: code.toUpperCase() }, email: email.toLowerCase() } });
}
