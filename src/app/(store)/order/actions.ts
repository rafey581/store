"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { submitProof, PaymentError } from "@/server/payments";
import { rupeesToPaisa } from "@/lib/money";
import { rateLimit, clientIp } from "@/server/rate-limit";
import type { ActionState } from "@/components/ui/form-message";

const schema = z.object({
  token: z.string().min(10).max(60),
  transactionId: z.string().trim().min(4, "Enter the transaction ID / reference").max(60),
  amount: z.string().trim().min(1, "Enter the amount you sent"),
  payerName: z.string().trim().max(100).optional(),
  accountId: z.string().max(40).optional(),
});

export async function submitProofAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const { token, transactionId, amount, payerName, accountId } = parsed.data;
  if (!(await rateLimit(`proof:${token}`, 5, 3600)) || !(await rateLimit(`proof-ip:${await clientIp()}`, 15, 3600))) return { error: "Too many uploads. Please try again later." };
  const amountPaisa = rupeesToPaisa(amount);
  if (amountPaisa === null || amountPaisa <= 0) return { error: "Enter a valid amount, e.g. 4500" };
  const file = formData.get("screenshot");
  if (!(file instanceof File) || file.size === 0) return { error: "Attach a screenshot of your payment." };
  try {
    await submitProof({ orderToken: token, file, transactionId, amountClaimedPaisa: amountPaisa, payerName: payerName || null, accountId: accountId || null });
  } catch (e) {
    if (e instanceof PaymentError || (e instanceof Error && /image|MB|JPG/.test(e.message))) return { error: e.message };
    console.error("submitProof failed", e);
    return { error: "Upload failed. Please try again." };
  }
  revalidatePath(`/order/${token}`);
  return { ok: "Thank you! We received your payment proof and will verify it shortly." };
}

export async function cancelOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200) || null;
  if (!(await rateLimit(`cancel:${await clientIp()}`, 10, 3600))) return { error: "Too many requests. Please try again later." };
  const { cancelOrderByCustomer } = await import("@/server/orders");
  const r = await cancelOrderByCustomer(token, reason);
  if (r !== "cancelled") return { error: r === "not_found" ? "Order not found." : "This order can no longer be cancelled online. Please contact us." };
  revalidatePath(`/order/${token}`);
  redirect(`/order/${token}?cancelled=1`);
}
