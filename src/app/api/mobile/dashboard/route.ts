import { requireMobileStaff, json } from "@/server/mobile-api";
import { getDashboardStats } from "@/server/dashboard";
import { expireDueOrders } from "@/server/orders";

export async function GET(req: Request) {
  const u = await requireMobileStaff(req, "dashboard");
  if (u instanceof Response) return u;
  await expireDueOrders(50);
  return json(await getDashboardStats());
}
