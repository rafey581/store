import { db } from "@/server/db";
import { revokeRefreshToken, verifyMobileRequest } from "@/server/auth/mobile";
import { json, readJson } from "@/server/mobile-api";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (typeof body.refreshToken === "string") await revokeRefreshToken(body.refreshToken);
  const user = await verifyMobileRequest(req);
  if (user && typeof body.expoPushToken === "string") await db.pushDevice.deleteMany({ where: { userId: user.id, expoPushToken: body.expoPushToken } });
  return json({ ok: true });
}
