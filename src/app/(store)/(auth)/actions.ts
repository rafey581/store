"use server";
import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { mergeGuestCart } from "@/server/cart";
import { rateLimit, clientIp } from "@/server/rate-limit";
import { sendEmail } from "@/server/email/send";
import { passwordResetEmail } from "@/server/email/templates";
import { getSettings } from "@/server/settings";
import { siteUrl } from "@/lib/utils";
import type { ActionState } from "@/components/ui/form-message";

function safeNext(next: unknown): string {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/account";
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      return { error: code === "rate_limited" ? "Too many attempts. Please wait 15 minutes." : "Incorrect email or password." };
    }
    throw e;
  }
  const user = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (user) await mergeGuestCart(user.id);
  let next = safeNext(formData.get("next"));
  if (next === "/account" && user && user.role !== "CUSTOMER") next = "/admin";
  redirect(next);
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().max(20).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await rateLimit(`register:${await clientIp()}`, 10, 3600))) return { error: "Too many sign-ups from your network. Try again later." };
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please fix the errors below.", fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, email, phone, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { email } });
  if (existing?.passwordHash) return { error: "An account with this email already exists. Please sign in." };
  const passwordHash = await hashPassword(password);
  if (existing) await db.user.update({ where: { id: existing.id }, data: { name, phone, passwordHash } });
  else await db.user.create({ data: { name, email, phone, passwordHash } });
  await signIn("credentials", { email, password, redirect: false });
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) await mergeGuestCart(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const generic: ActionState = { ok: "If an account exists for that email, we have sent a reset link." };
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email." };
  if (!(await rateLimit(`forgot:${await clientIp()}`, 5, 3600)) || !(await rateLimit(`forgot:${email}`, 3, 3600))) return generic;
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.disabledAt) return generic;
  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600_000) } });
  const s = await getSettings();
  const mail = passwordResetEmail(s.storeName, siteUrl(`/reset-password?token=${token}`));
  await sendEmail({ to: email, template: "password_reset", ...mail });
  return generic;
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return { error: "This reset link is invalid or has expired." };
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.refreshToken.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  return { ok: "Password updated. You can now sign in." };
}
