"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { requireCustomer } from "@/server/auth/session";
import { signIn } from "@/auth";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { normalizePkPhone } from "@/lib/utils";
import type { ActionState } from "@/components/ui/form-message";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCustomer();
  const parsed = z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().max(20) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid name." };
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name, phone: parsed.data.phone ? normalizePkPhone(parsed.data.phone) : null } });
  revalidatePath("/account");
  return { ok: "Profile saved." };
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCustomer();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row?.passwordHash || !(await verifyPassword(current, row.passwordHash))) return { error: "Current password is incorrect." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() } });
  await db.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  // Other devices are signed out; keep this browser signed in with a fresh session.
  await signIn("credentials", { email: user.email, password: next, redirect: false });
  // Redirect so the next request uses the new session cookie.
  redirect("/account?passwordChanged=1");
}

const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().transform(normalizePkPhone).refine((v) => /^03\d{9}$/.test(v), "Enter a valid mobile number"),
  line1: z.string().trim().min(5).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(60),
  province: z.string().trim().max(60).optional(),
  postalCode: z.string().trim().max(10).optional(),
});

export async function addAddress(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCustomer("/account/addresses");
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the address." };
  if ((await db.address.count({ where: { userId: user.id } })) >= 10) return { error: "You can save up to 10 addresses." };
  const isFirst = (await db.address.count({ where: { userId: user.id } })) === 0;
  await db.address.create({ data: { ...parsed.data, line2: parsed.data.line2 || null, province: parsed.data.province || null, postalCode: parsed.data.postalCode || null, userId: user.id, isDefault: isFirst } });
  revalidatePath("/account/addresses");
  return { ok: "Address saved." };
}

export async function deleteAddress(formData: FormData) {
  const user = await requireCustomer("/account/addresses");
  await db.address.deleteMany({ where: { id: String(formData.get("id")), userId: user.id } });
  revalidatePath("/account/addresses");
}

export async function setDefaultAddress(formData: FormData) {
  const user = await requireCustomer("/account/addresses");
  const id = String(formData.get("id"));
  const owned = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!owned) return;
  await db.$transaction([db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }), db.address.update({ where: { id }, data: { isDefault: true } })]);
  revalidatePath("/account/addresses");
}
