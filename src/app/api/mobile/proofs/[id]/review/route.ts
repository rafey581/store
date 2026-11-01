import { requireMobileStaff, json, apiError, readJson } from "@/server/mobile-api";
import { approveProof, rejectProof } from "@/server/payments";
import { audit } from "@/server/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireMobileStaff(req, "proofs");
  if (u instanceof Response) return u;
  const { id } = await params;
  const body = await readJson(req);
  if (body.decision === "approve") {
    const r = await approveProof(id, u.id);
    await audit(u.id, "proof.approve", "PaymentProof", id, { result: r, via: "mobile" });
    if (r === "not_found") return apiError("Not found", 404);
    if (r === "already_reviewed") return apiError("This proof was already reviewed.", 409);
    return json({ ok: "Payment approved. Order marked paid." });
  }
  if (body.decision === "reject") {
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
    if (reason.length < 3) return apiError("Enter a reason for the customer.");
    const r = await rejectProof(id, u.id, reason);
    await audit(u.id, "proof.reject", "PaymentProof", id, { result: r, reason, via: "mobile" });
    if (r === "not_found") return apiError("Not found", 404);
    if (r === "already_reviewed") return apiError("This proof was already reviewed.", 409);
    return json({ ok: "Proof rejected." });
  }
  return apiError("decision must be approve or reject");
}
