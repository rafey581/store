import { NextResponse } from "next/server";
import { verifyMobileRequest } from "@/server/auth/mobile";
import { can, type Permission } from "@/lib/permissions";

export type StaffUser = NonNullable<Awaited<ReturnType<typeof verifyMobileRequest>>>;

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiError(message: string, status = 400) {
  return json({ error: message }, status);
}

/** Authenticates a mobile request (Bearer access token) and checks the role on the server. */
export async function requireMobileStaff(req: Request, perm: Permission = "dashboard"): Promise<StaffUser | NextResponse> {
  const user = await verifyMobileRequest(req);
  if (!user) return apiError("Unauthorized", 401);
  if (!can(user.role, perm)) return apiError("Forbidden", 403);
  return user;
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const j = await req.json();
    return j && typeof j === "object" ? (j as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
