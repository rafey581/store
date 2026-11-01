import { z } from "zod";
import { db } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import { issueTokens } from "@/server/auth/mobile";
import { rateLimit, ipFromHeaders } from "@/server/rate-limit";
import { json, apiError, readJson } from "@/server/mobile-api";
import { audit } from "@/server/audit";

export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200), deviceName: z.string().max(100).optional() }).safeParse(await readJson(req));
  if (!parsed.success) return apiError("Enter your email and password.");
  const { email, password, deviceName } = parsed.data;
  const ip = ipFromHeaders(req.headers);
  if (!(await rateLimit(`login:ip:${ip}`, 30, 900)) || !(await rateLimit(`login:email:${email}`, 8, 900))) return apiError("Too many attempts. Please wait 15 minutes.", 429);
  const user = await db.user.findUnique({ where: { email } });
  const valid = user?.passwordHash && !user.disabledAt && (await verifyPassword(password, user.passwordHash));
  if (!user || !valid) return apiError("Incorrect email or password.", 401);
  if (user.role !== "OWNER" && user.role !== "STAFF") return apiError("This app is for store staff only.", 403);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const t = await issueTokens(user, deviceName ?? null);
  await audit(user.id, "mobile.login", "User", user.id, { deviceName: deviceName ?? null });
  return json({ accessToken: t.accessToken, refreshToken: t.refreshToken, expiresIn: t.expiresIn, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}
