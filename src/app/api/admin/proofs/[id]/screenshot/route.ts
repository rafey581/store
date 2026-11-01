import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { verifyMobileRequest } from "@/server/auth/mobile";
import { can } from "@/lib/permissions";
import { readPrivateObject } from "@/server/storage";

// Payment screenshots are private: only staff (web session or mobile token) can view them.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = (await getCurrentUser()) ?? (await verifyMobileRequest(req));
  if (!user || !can(user.role, "proofs")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const proof = await db.paymentProof.findUnique({ where: { id }, select: { screenshotKey: true } });
  if (!proof) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const obj = await readPrivateObject(proof.screenshotKey);
  if ("redirect" in obj) return NextResponse.redirect(obj.redirect, { headers: { "Cache-Control": "no-store" } });
  return new NextResponse(new Uint8Array(obj.buffer), { headers: { "Content-Type": obj.contentType, "Cache-Control": "private, no-store" } });
}
