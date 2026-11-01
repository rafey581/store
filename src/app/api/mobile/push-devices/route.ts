import { z } from "zod";
import { db } from "@/server/db";
import { requireMobileStaff, json, apiError, readJson } from "@/server/mobile-api";

const tokenRe = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

export async function POST(req: Request) {
  const u = await requireMobileStaff(req);
  if (u instanceof Response) return u;
  const parsed = z
    .object({ expoPushToken: z.string().regex(tokenRe, "Invalid Expo push token"), platform: z.enum(["ANDROID", "IOS"]).default("ANDROID"), notifyOrders: z.boolean().optional(), notifyProofs: z.boolean().optional() })
    .safeParse(await readJson(req));
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  // A token moves to whoever is signed in on that device now.
  const device = await db.pushDevice.upsert({
    where: { expoPushToken: d.expoPushToken },
    update: { userId: u.id, platform: d.platform, lastSeenAt: new Date(), ...(d.notifyOrders !== undefined ? { notifyOrders: d.notifyOrders } : {}), ...(d.notifyProofs !== undefined ? { notifyProofs: d.notifyProofs } : {}) },
    create: { userId: u.id, expoPushToken: d.expoPushToken, platform: d.platform, notifyOrders: d.notifyOrders ?? true, notifyProofs: d.notifyProofs ?? true },
    select: { notifyOrders: true, notifyProofs: true },
  });
  return json(device);
}

export async function DELETE(req: Request) {
  const u = await requireMobileStaff(req);
  if (u instanceof Response) return u;
  const body = await readJson(req);
  if (typeof body.expoPushToken === "string") await db.pushDevice.deleteMany({ where: { userId: u.id, expoPushToken: body.expoPushToken } });
  return json({ ok: true });
}
