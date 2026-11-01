"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { rupeesToPaisa } from "@/lib/money";
import { cityKey } from "@/lib/utils";
import { audit } from "@/server/audit";
import type { ActionState } from "@/components/ui/form-message";

const schema = z.object({
  id: z.string().optional(),
  city: z.string().trim().min(2).max(60),
  province: z.string().trim().max(60).optional(),
  fee: z.string(),
  freeAbove: z.string().optional(),
  minDays: z.coerce.number().int().min(0).max(60),
  maxDays: z.coerce.number().int().min(0).max(60),
  isActive: z.string().optional(),
});

export async function saveShippingRate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff("shipping");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const fee = rupeesToPaisa(d.fee);
  if (fee === null) return { error: "Enter a valid fee." };
  if (d.maxDays < d.minDays) return { error: "Max days must be at least min days." };
  const key = cityKey(d.city);
  const clash = await db.shippingRate.findFirst({ where: { cityKey: key, NOT: d.id ? { id: d.id } : undefined } });
  if (clash) return { error: `${d.city} already has a rate.` };
  const data = { city: d.city, cityKey: key, province: d.province || null, feePaisa: fee, freeShippingAbovePaisa: d.freeAbove ? rupeesToPaisa(d.freeAbove) : null, minDays: d.minDays, maxDays: d.maxDays, isActive: d.isActive === "on" };
  const r = d.id ? await db.shippingRate.update({ where: { id: d.id }, data }) : await db.shippingRate.create({ data });
  await audit(user.id, "shipping.save", "ShippingRate", r.id, { city: r.city, fee });
  revalidatePath("/admin/shipping");
  return { ok: "Saved." };
}

export async function deleteShippingRate(formData: FormData) {
  const user = await requireStaff("shipping");
  const id = String(formData.get("id"));
  await db.shippingRate.delete({ where: { id } }).catch(() => null);
  await audit(user.id, "shipping.delete", "ShippingRate", id);
  revalidatePath("/admin/shipping");
}
