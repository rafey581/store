import { requireMobileStaff, json, apiError, readJson } from "@/server/mobile-api";
import { markCodCollected } from "@/server/payments";
import { audit } from "@/server/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireMobileStaff(req, "orders");
  if (u instanceof Response) return u;
  const { id } = await params;
  const body = await readJson(req);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : undefined;
  const r = await markCodCollected(id, u.id, note);
  await audit(u.id, "order.cod_collected", "Order", id, { result: r, via: "mobile" });
  if (r === "not_found") return apiError("Not found", 404);
  if (r === "not_cod") return apiError("This is not a cash on delivery order.");
  if (r === "already") return apiError("Cash was already marked as collected.", 409);
  if (r === "invalid_status") return apiError("This order cannot be marked as collected.");
  return json({ ok: "Cash collected. Order marked paid." });
}
