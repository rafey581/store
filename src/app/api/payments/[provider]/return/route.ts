import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { reconcilePayment } from "@/server/payments";
import { easypaisa } from "@/server/payments/providers/easypaisa";
import { PROVIDER_SLUGS, autoPostHtml } from "@/server/payments/http";
import { siteUrl } from "@/lib/utils";

// Where the customer's browser lands after the hosted payment page.
// This NEVER marks an order paid by itself: it only asks the gateway
// (server-to-server) for the real status, then shows the order page.
async function handle(req: Request, slug: string) {
  const method = PROVIDER_SLUGS[slug];
  const url = new URL(req.url);
  const form = req.method === "POST" ? Object.fromEntries(new URLSearchParams(await req.text())) : {};
  const ref = url.searchParams.get("ref") ?? "";
  if (!method || !/^[A-Za-z0-9-]{4,40}$/.test(ref)) return NextResponse.redirect(siteUrl("/"), 303);

  // Easypaisa step 2: post auth_token to Confirm.jsf, which then returns here again with the status.
  const authToken = url.searchParams.get("auth_token") ?? form.auth_token;
  if (method === "EASYPAISA" && authToken && easypaisa.isConfigured()) {
    const back = siteUrl(`/api/payments/easypaisa/return?ref=${encodeURIComponent(ref)}`);
    const f = easypaisa.confirmForm(authToken, back);
    return new NextResponse(autoPostHtml(f.action, f.fields, "Confirming your payment…"), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }

  const payment = await db.payment.findUnique({ where: { reference: ref }, include: { order: { select: { trackingToken: true } } } });
  if (!payment || payment.method !== method) return NextResponse.redirect(siteUrl("/"), 303);
  try {
    await reconcilePayment(payment.id);
  } catch (e) {
    console.error("[payments] reconcile on return failed", e);
  }
  const order = await db.order.findFirst({ where: { payments: { some: { id: payment.id } } }, select: { paymentStatus: true, trackingToken: true } });
  const flag = order?.paymentStatus === "PAID" ? "" : "?payment=returned";
  return NextResponse.redirect(siteUrl(`/order/${payment.order.trackingToken}${flag}`), 303);
}

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  return handle(req, (await params).provider);
}

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  return handle(req, (await params).provider);
}
