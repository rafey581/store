"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { rupeesToPaisa } from "@/lib/money";
import { audit } from "@/server/audit";
import type { ActionState } from "@/components/ui/form-message";

const schema = z.object({
  id: z.string().optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "Code: 3–30 letters, numbers, - or _"),
  description: z.string().trim().max(200).optional(),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  value: z.string().optional(),
  minSubtotal: z.string().optional(),
  maxDiscount: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  usageLimit: z.string().optional(),
  perCustomerLimit: z.string().optional(),
  isActive: z.string().optional(),
});

const optInt = (s?: string) => (s && s.trim() ? Math.max(0, Math.trunc(Number(s))) : null);
// datetime-local values are entered in Pakistan time
const pkDate = (s?: string) => (s && s.trim() ? new Date(`${s}:00+05:00`) : null);

export async function saveCoupon(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff("coupons");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  let value = 0;
  if (d.type === "PERCENT") {
    const pct = Number(d.value);
    if (!(pct > 0 && pct <= 100)) return { error: "Percent must be between 1 and 100." };
    value = Math.round(pct * 100);
  } else if (d.type === "FIXED") {
    const p = rupeesToPaisa(d.value ?? "");
    if (!p) return { error: "Enter the discount amount in rupees." };
    value = p;
  }
  const data = {
    code: d.code,
    description: d.description || null,
    type: d.type,
    value,
    minSubtotalPaisa: rupeesToPaisa(d.minSubtotal ?? "") ?? 0,
    maxDiscountPaisa: d.type === "PERCENT" ? rupeesToPaisa(d.maxDiscount ?? "") : null,
    startsAt: pkDate(d.startsAt),
    endsAt: pkDate(d.endsAt),
    usageLimit: optInt(d.usageLimit),
    perCustomerLimit: optInt(d.perCustomerLimit),
    isActive: d.isActive === "on",
  };
  const clash = await db.coupon.findFirst({ where: { code: d.code, NOT: d.id ? { id: d.id } : undefined } });
  if (clash) return { error: "A coupon with this code already exists." };
  const c = d.id ? await db.coupon.update({ where: { id: d.id }, data }) : await db.coupon.create({ data });
  await audit(user.id, d.id ? "coupon.update" : "coupon.create", "Coupon", c.id, { code: c.code });
  revalidatePath("/admin/coupons");
  return { ok: "Coupon saved." };
}

export async function deleteCoupon(formData: FormData) {
  const user = await requireStaff("coupons");
  const id = String(formData.get("id"));
  const used = await db.couponRedemption.count({ where: { couponId: id } });
  if (used > 0) await db.coupon.update({ where: { id }, data: { isActive: false } });
  else await db.coupon.delete({ where: { id } });
  await audit(user.id, used ? "coupon.deactivate" : "coupon.delete", "Coupon", id);
  revalidatePath("/admin/coupons");
}
