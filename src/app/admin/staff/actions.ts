"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { hashPassword } from "@/server/auth/password";
import { audit } from "@/server/audit";
import type { ActionState } from "@/components/ui/form-message";

async function ownerCount() {
  return db.user.count({ where: { role: "OWNER", disabledAt: null } });
}

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireStaff("staff");
  const parsed = z
    .object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), password: z.string().min(10, "Temporary password must be at least 10 characters"), role: z.enum(["STAFF", "OWNER"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const existing = await db.user.findUnique({ where: { email: d.email } });
  if (existing && existing.role !== "CUSTOMER") return { error: "This person is already a staff member." };
  const passwordHash = await hashPassword(d.password);
  const u = existing
    ? await db.user.update({ where: { id: existing.id }, data: { role: d.role, name: d.name, passwordHash, disabledAt: null } })
    : await db.user.create({ data: { email: d.email, name: d.name, role: d.role, passwordHash } });
  await audit(me.id, "staff.create", "User", u.id, { email: u.email, role: u.role });
  revalidatePath("/admin/staff");
  return { ok: `${d.email} can now sign in at /login. Share the temporary password securely and ask them to change it.` };
}

export async function updateStaff(formData: FormData) {
  const me = await requireStaff("staff");
  const id = String(formData.get("id"));
  const op = String(formData.get("op"));
  const target = await db.user.findUnique({ where: { id } });
  if (!target || target.role === "CUSTOMER") return;
  const removingOwner = target.role === "OWNER" && !target.disabledAt && (op === "make_staff" || op === "disable" || op === "remove");
  if (removingOwner && (await ownerCount()) <= 1) return; // never remove the last owner
  if (target.id === me.id && op !== "enable") return; // cannot demote/disable yourself
  const data =
    op === "make_owner" ? { role: "OWNER" as const }
    : op === "make_staff" ? { role: "STAFF" as const }
    : op === "disable" ? { disabledAt: new Date() }
    : op === "enable" ? { disabledAt: null }
    : op === "remove" ? { role: "CUSTOMER" as const }
    : null;
  if (!data) return;
  await db.user.update({ where: { id }, data });
  if (op === "disable" || op === "remove") {
    await db.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await db.pushDevice.deleteMany({ where: { userId: id } });
  }
  await audit(me.id, `staff.${op}`, "User", id);
  revalidatePath("/admin/staff");
}
