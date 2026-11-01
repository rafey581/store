"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { findCart, getOrCreateCartId, findCoupon, cartLines } from "@/server/cart";
import { computePricing } from "@/lib/pricing";
import { rateLimit, clientIp } from "@/server/rate-limit";
import type { ActionState } from "@/components/ui/form-message";

const MAX_QTY = 50;

export async function addToCart(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ variantId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(MAX_QTY) }).safeParse({
    variantId: formData.get("variantId"),
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) return { error: "Please choose an option and quantity." };
  const { variantId, quantity } = parsed.data;
  const variant = await db.productVariant.findFirst({ where: { id: variantId, isActive: true, product: { status: "ACTIVE" } }, select: { stock: true } });
  if (!variant) return { error: "This item is not available." };
  const cartId = await getOrCreateCartId();
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
  const newQty = Math.min((existing?.quantity ?? 0) + quantity, MAX_QTY);
  if (newQty > variant.stock) return { error: variant.stock > 0 ? `Only ${variant.stock} in stock.` : "Out of stock." };
  await db.cartItem.upsert({ where: { cartId_variantId: { cartId, variantId } }, update: { quantity: newQty }, create: { cartId, variantId, quantity: newQty } });
  revalidatePath("/", "layout");
  return { ok: "Added to cart." };
}

async function ownItem(itemId: string) {
  const cart = await findCart();
  if (!cart) return null;
  return cart.items.find((i) => i.id === itemId) ?? null;
}

export async function updateCartItem(formData: FormData): Promise<void> {
  const itemId = String(formData.get("itemId") ?? "");
  const quantity = Math.max(0, Math.min(MAX_QTY, Math.trunc(Number(formData.get("quantity")))));
  const item = await ownItem(itemId);
  if (!item || Number.isNaN(quantity)) return;
  if (quantity === 0) await db.cartItem.delete({ where: { id: item.id } });
  else await db.cartItem.update({ where: { id: item.id }, data: { quantity } });
  revalidatePath("/", "layout");
}

export async function removeCartItem(formData: FormData): Promise<void> {
  const item = await ownItem(String(formData.get("itemId") ?? ""));
  if (item) await db.cartItem.delete({ where: { id: item.id } });
  revalidatePath("/", "layout");
}

export async function applyCoupon(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase().slice(0, 40);
  if (!code) return { error: "Enter a coupon code." };
  if (!(await rateLimit(`coupon:${await clientIp()}`, 20, 600))) return { error: "Too many attempts. Try again later." };
  const cart = await findCart();
  if (!cart || cart.items.length === 0) return { error: "Your cart is empty." };
  const coupon = await findCoupon(code);
  if (!coupon) return { error: "Coupon not found." };
  const lines = cartLines(cart).filter((l) => !l.problem);
  const pricing = computePricing({ lines, coupon, shipping: null });
  if (pricing.couponError) return { error: pricing.couponError };
  await db.cart.update({ where: { id: cart.id }, data: { couponCode: code } });
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { ok: `Coupon ${code} applied.` };
}

export async function removeCoupon(): Promise<void> {
  const cart = await findCart();
  if (cart) await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  revalidatePath("/cart");
  revalidatePath("/checkout");
}
