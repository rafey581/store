"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { audit } from "@/server/audit";

export async function toggleCustomerDisabled(formData: FormData) {
  const user = await requireStaff("customers");
  const id = String(formData.get("id"));
  const target = await db.user.findUnique({ where: { id } });
  if (!target || target.role !== "CUSTOMER") return;
  await db.user.update({ where: { id }, data: { disabledAt: target.disabledAt ? null : new Date() } });
  await audit(user.id, target.disabledAt ? "customer.enable" : "customer.disable", "User", id);
  revalidatePath(`/admin/customers/${id}`);
}
