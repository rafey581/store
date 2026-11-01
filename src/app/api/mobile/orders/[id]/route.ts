import { db } from "@/server/db";
import { requireMobileStaff, json, apiError } from "@/server/mobile-api";
import { ADMIN_TRANSITIONS, ownerOnlyTransition } from "@/lib/order-status";
import { can } from "@/lib/permissions";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireMobileStaff(req, "orders");
  if (u instanceof Response) return u;
  const { id } = await params;
  const o = await db.order.findUnique({
    where: { id },
    include: {
      items: { select: { id: true, productName: true, variantTitle: true, sku: true, quantity: true, unitPricePaisa: true, lineTotalPaisa: true, imageUrl: true } },
      statusEvents: { orderBy: { createdAt: "asc" }, select: { id: true, fromStatus: true, toStatus: true, note: true, actorType: true, createdAt: true } },
      proofs: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, transactionId: true, amountClaimedPaisa: true, payerName: true, rejectionReason: true, createdAt: true } },
      payments: { orderBy: { createdAt: "desc" }, select: { id: true, method: true, status: true, amountPaisa: true, reference: true, failureReason: true, createdAt: true } },
    },
  });
  if (!o) return apiError("Not found", 404);
  const allowedTransitions = (ADMIN_TRANSITIONS[o.status] ?? []).filter((to) => !ownerOnlyTransition(o.status, to) || can(u.role, "refunds"));
  const { trackingToken: _t, ...rest } = o;
  void _t;
  return json({ ...rest, allowedTransitions });
}
