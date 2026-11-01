import { NextResponse } from "next/server";
import { db } from "@/server/db";

// Liveness/readiness check for load balancers, uptime monitors and the deploy script.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up", time: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
