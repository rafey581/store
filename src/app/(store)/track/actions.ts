"use server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { normalizePkPhone } from "@/lib/utils";
import { rateLimit, clientIp } from "@/server/rate-limit";
import type { ActionState } from "@/components/ui/form-message";

export async function trackAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit(`track:${await clientIp()}`, 20, 900))) return { error: "Too many lookups. Please try again later." };
  const number = Number(String(formData.get("number") ?? "").replace(/[^\d]/g, ""));
  const contact = String(formData.get("contact") ?? "").trim().toLowerCase();
  if (!number || !contact) return { error: "Enter your order number and email or phone." };
  const order = await db.order.findUnique({ where: { number }, select: { trackingToken: true, email: true, phone: true } });
  const matches = order && (order.email === contact || order.phone === normalizePkPhone(contact));
  if (!order || !matches) return { error: "We could not find an order with those details." };
  redirect(`/order/${order.trackingToken}`);
}
