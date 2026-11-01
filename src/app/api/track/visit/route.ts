import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { karachiDay } from "@/lib/utils";

const BOT = /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|lighthouse|headless/i;

export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  if (BOT.test(ua)) return new NextResponse(null, { status: 204 });
  let path = "/";
  try {
    const body = (await req.json()) as { path?: unknown };
    if (typeof body.path === "string") path = body.path.slice(0, 200);
  } catch {}
  const jar = await cookies();
  let vid = jar.get("vid")?.value;
  const valid = vid && /^[A-Za-z0-9_-]{16,40}$/.test(vid);
  const day = karachiDay();
  let isNewToday = false;
  if (!valid) {
    vid = randomBytes(16).toString("base64url");
    jar.set("vid", vid, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
    await db.visitor.create({ data: { id: vid, lastPath: path } });
    isNewToday = true;
  } else {
    const prev = await db.visitor.findUnique({ where: { id: vid! }, select: { lastSeenAt: true } });
    if (!prev) {
      await db.visitor.create({ data: { id: vid!, lastPath: path } });
      isNewToday = true;
    } else {
      isNewToday = karachiDay(prev.lastSeenAt).getTime() !== day.getTime();
      await db.visitor.update({ where: { id: vid! }, data: { lastSeenAt: new Date(), lastPath: path, pageViews: { increment: 1 } } });
    }
  }
  await db.dailyStat.upsert({
    where: { date: day },
    update: { pageViews: { increment: 1 }, ...(isNewToday ? { visitors: { increment: 1 } } : {}) },
    create: { date: day, pageViews: 1, visitors: 1 },
  });
  return new NextResponse(null, { status: 204 });
}
