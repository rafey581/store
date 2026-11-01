"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/session";
import { rupeesToPaisa } from "@/lib/money";
import { audit } from "@/server/audit";
import type { ActionState } from "@/components/ui/form-message";

const settingsSchema = z.object({
  storeName: z.string().trim().min(1).max(80),
  supportEmail: z.string().trim().max(120).optional(),
  supportPhone: z.string().trim().max(30).optional(),
  whatsappNumber: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  orderEmailBcc: z.string().trim().max(120).optional(),
  defaultShipping: z.string(),
  freeShippingAbove: z.string().optional(),
  lowStockThreshold: z.coerce.number().int().min(0).max(10000),
  gatewayOrderExpiryMins: z.coerce.number().int().min(15).max(1440),
  manualOrderExpiryHours: z.coerce.number().int().min(1).max(240),
  codFee: z.string().optional(),
  codMaxOrder: z.string().optional(),
  heroTitle: z.string().trim().max(120).optional(),
  heroSubtitle: z.string().trim().max(300).optional(),
  announcement: z.string().trim().max(160).optional(),
});

const bool = (fd: FormData, k: string) => fd.get(k) === "on";

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireOwner();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const defaultShippingPaisa = rupeesToPaisa(d.defaultShipping);
  if (defaultShippingPaisa === null) return { error: "Enter a valid default shipping fee." };
  const codFeePaisa = d.codFee ? rupeesToPaisa(d.codFee) : 0;
  if (codFeePaisa === null) return { error: "Enter a valid cash on delivery fee." };
  const codMaxOrderPaisa = d.codMaxOrder ? rupeesToPaisa(d.codMaxOrder) : null;
  if (d.codMaxOrder && codMaxOrderPaisa === null) return { error: "Enter a valid COD order limit." };
  if (d.supportEmail && !z.string().email().safeParse(d.supportEmail).success) return { error: "Support email is not valid." };
  if (d.orderEmailBcc && !z.string().email().safeParse(d.orderEmailBcc).success) return { error: "New-order notification email is not valid." };
  await db.storeSettings.update({
    where: { id: 1 },
    data: {
      storeName: d.storeName,
      supportEmail: d.supportEmail || null,
      supportPhone: d.supportPhone || null,
      whatsappNumber: d.whatsappNumber || null,
      address: d.address || null,
      orderEmailBcc: d.orderEmailBcc || null,
      defaultShippingPaisa,
      freeShippingAbovePaisa: d.freeShippingAbove ? rupeesToPaisa(d.freeShippingAbove) : null,
      lowStockThreshold: d.lowStockThreshold,
      gatewayOrderExpiryMins: d.gatewayOrderExpiryMins,
      manualOrderExpiryHours: d.manualOrderExpiryHours,
      enableSafepay: bool(formData, "enableSafepay"),
      enablePayfast: bool(formData, "enablePayfast"),
      enableJazzcash: bool(formData, "enableJazzcash"),
      enableEasypaisa: bool(formData, "enableEasypaisa"),
      enableManualTransfer: bool(formData, "enableManualTransfer"),
      enableCod: bool(formData, "enableCod"),
      codFeePaisa,
      codMaxOrderPaisa,
      heroTitle: d.heroTitle || null,
      heroSubtitle: d.heroSubtitle || null,
      announcement: d.announcement || null,
    },
  });
  await audit(user.id, "settings.update", "StoreSettings", "1");
  revalidatePath("/", "layout");
  return { ok: "Settings saved." };
}

const accountSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["BANK", "WALLET"]),
  label: z.string().trim().min(2).max(60),
  accountTitle: z.string().trim().min(2).max(80),
  accountNumber: z.string().trim().min(4).max(40),
  iban: z.string().trim().max(34).optional(),
  instructions: z.string().trim().max(300).optional(),
  sortOrder: z.coerce.number().int().min(0).max(100).default(0),
  isActive: z.string().optional(),
});

export async function saveManualAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireOwner();
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { id, isActive, ...d } = parsed.data;
  const data = { ...d, iban: d.iban || null, instructions: d.instructions || null, isActive: isActive === "on" };
  const row = id ? await db.manualPaymentAccount.update({ where: { id }, data }) : await db.manualPaymentAccount.create({ data });
  await audit(user.id, "manual_account.save", "ManualPaymentAccount", row.id, { label: row.label });
  revalidatePath("/admin/settings");
  return { ok: "Account saved." };
}

export async function deleteManualAccount(formData: FormData) {
  const user = await requireOwner();
  const id = String(formData.get("id"));
  const used = await db.paymentProof.count({ where: { accountId: id } });
  if (used) await db.manualPaymentAccount.update({ where: { id }, data: { isActive: false } });
  else await db.manualPaymentAccount.delete({ where: { id } });
  await audit(user.id, "manual_account.delete", "ManualPaymentAccount", id);
  revalidatePath("/admin/settings");
}
