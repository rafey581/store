"use server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { findCart, getOrCreateCartId } from "@/server/cart";
import { checkoutSchema, placeOrder, quoteCart, CheckoutError } from "@/server/orders";
import { availableMethods } from "@/server/payments";
import { notifyOrder } from "@/server/notify";
import { getSettings } from "@/server/settings";
import { getCurrentUser } from "@/server/auth/session";
import { rateLimit, clientIp } from "@/server/rate-limit";
import type { ActionState } from "@/components/ui/form-message";

export type QuoteView = { subtotalPaisa: number; discountPaisa: number; shippingPaisa: number; codFeePaisa: number; codAllowed: boolean; totalPaisa: number; freeShipping: boolean; couponApplied: string | null; couponError: string | null; deliveryDays: string | null; blocked: string | null };

export async function quoteAction(city: string, email: string, paymentMethod?: string): Promise<QuoteView> {
  const cart = await findCart();
  const q = await quoteCart(cart, { city: city.slice(0, 60), email: email.slice(0, 200) || null, paymentMethod: paymentMethod ?? null });
  const s = await getSettings();
  const codAllowed = s.codMaxOrderPaisa === null || q.totalPaisa - q.codFeePaisa + s.codFeePaisa <= s.codMaxOrderPaisa;
  return { subtotalPaisa: q.subtotalPaisa, discountPaisa: q.discountPaisa, shippingPaisa: q.shippingPaisa, codFeePaisa: q.codFeePaisa, codAllowed, totalPaisa: q.totalPaisa, freeShipping: q.freeShipping, couponApplied: q.couponApplied, couponError: q.couponError, deliveryDays: q.deliveryDays, blocked: q.blocked };
}

export async function placeOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit(`checkout:${await clientIp()}`, 15, 600))) return { error: "Too many attempts. Please wait a few minutes." };
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  const input = parsed.data;
  if (!(await availableMethods()).includes(input.paymentMethod)) return { error: "That payment method is not available. Please choose another." };

  const user = await getCurrentUser();
  const cartId = await getOrCreateCartId();
  let order;
  try {
    order = await placeOrder({ cartId, userId: user?.id ?? null, input });
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    console.error("placeOrder failed", e);
    return { error: "Something went wrong while placing your order. Please try again." };
  }

  if (user && formData.get("saveAddress") === "on") {
    const count = await db.address.count({ where: { userId: user.id } });
    await db.address.create({ data: { userId: user.id, fullName: input.customerName, phone: input.phone, line1: input.shipLine1, line2: input.shipLine2, city: input.shipCity, province: input.shipProvince, postalCode: input.shipPostalCode, isDefault: count === 0 } });
  }
  await notifyOrder(order.id, "placed");

  if (input.paymentMethod === "MANUAL_TRANSFER" || input.paymentMethod === "COD") redirect(`/order/${order.trackingToken}?placed=1`);
  redirect(`/order/${order.trackingToken}?placed=1&pay=${input.paymentMethod}`);
}
