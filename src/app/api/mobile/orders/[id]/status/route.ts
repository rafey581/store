import { requireMobileStaff, json, apiError, readJson } from "@/server/mobile-api";
import { changeOrderStatusAs } from "@/server/admin-orders";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireMobileStaff(req, "orders");
  if (u instanceof Response) return u;
  const { id } = await params;
  const body = await readJson(req);
  const res = await changeOrderStatusAs(u, { ...body, orderId: id });
  if ("error" in res) return apiError(res.error, res.error === "Order not found." ? 404 : 400);
  return json(res);
}
