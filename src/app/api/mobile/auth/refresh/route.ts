import { rotateRefreshToken } from "@/server/auth/mobile";
import { json, apiError, readJson } from "@/server/mobile-api";
import { rateLimit, ipFromHeaders } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!(await rateLimit(`refresh:${ipFromHeaders(req.headers)}`, 60, 900))) return apiError("Too many requests", 429);
  const body = await readJson(req);
  const token = typeof body.refreshToken === "string" ? body.refreshToken : "";
  if (!token) return apiError("Missing refresh token", 400);
  const t = await rotateRefreshToken(token);
  if (!t) return apiError("Session expired. Please sign in again.", 401);
  return json({ accessToken: t.accessToken, refreshToken: t.refreshToken, expiresIn: t.expiresIn, user: { id: t.user.id, name: t.user.name, email: t.user.email, role: t.user.role } });
}
