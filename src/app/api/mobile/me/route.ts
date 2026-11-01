import { requireMobileStaff, json } from "@/server/mobile-api";
import { can } from "@/lib/permissions";

export async function GET(req: Request) {
  const u = await requireMobileStaff(req);
  if (u instanceof Response) return u;
  return json({ id: u.id, name: u.name, email: u.email, role: u.role, permissions: { refunds: can(u.role, "refunds"), settings: can(u.role, "settings") } });
}
