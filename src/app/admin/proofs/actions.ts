"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/server/auth/session";
import { approveProof, rejectProof } from "@/server/payments";
import { audit } from "@/server/audit";
import type { ActionState } from "@/components/ui/form-message";

export async function reviewProofAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff("proofs");
  const id = String(formData.get("proofId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision === "approve") {
    const r = await approveProof(id, user.id);
    await audit(user.id, "proof.approve", "PaymentProof", id, { result: r });
    revalidatePath("/admin", "layout");
    return r === "approved" ? { ok: "Payment approved. Order marked paid." } : { error: r === "already_reviewed" ? "This proof was already reviewed." : "Proof not found." };
  }
  if (decision === "reject") {
    const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
    if (reason.length < 3) return { error: "Enter a reason for the customer." };
    const r = await rejectProof(id, user.id, reason);
    await audit(user.id, "proof.reject", "PaymentProof", id, { result: r, reason });
    revalidatePath("/admin", "layout");
    return r === "rejected" ? { ok: "Proof rejected. The customer was asked to upload again." } : { error: r === "already_reviewed" ? "This proof was already reviewed." : "Proof not found." };
  }
  return { error: "Unknown action." };
}
