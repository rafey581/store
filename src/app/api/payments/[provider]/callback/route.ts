import { NextResponse } from "next/server";
import { getProvider, handleGatewayCallback } from "@/server/payments";
import { PROVIDER_SLUGS } from "@/server/payments/http";

// Server-to-server notifications (webhooks / IPN) from payment gateways.
// Every request is verified by the provider (signature and/or a status query
// back to the gateway) and applied idempotently by the payment module.
async function handle(req: Request, slug: string) {
  const method = PROVIDER_SLUGS[slug];
  const provider = method ? getProvider(method) : null;
  if (!method || !provider || !provider.isConfigured()) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  const url = new URL(req.url);
  const rawBody = req.method === "POST" ? await req.text() : "";
  try {
    const verified = await provider.verifyCallback({ rawBody, headers: req.headers, query: url.searchParams, contentType: req.headers.get("content-type") ?? "" });
    const outcome = await handleGatewayCallback(method, verified);
    console.info(`[payments] ${method} callback -> ${outcome}`);
    if (outcome === "invalid_signature") return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
    // JazzCash IPN expects a pp_ResponseCode acknowledgement; others only need HTTP 200.
    if (method === "JAZZCASH") return NextResponse.json({ pp_ResponseCode: "000", pp_ResponseMessage: "IPN received", outcome });
    return NextResponse.json({ ok: true, outcome });
  } catch (e) {
    console.error(`[payments] ${method} callback error`, e);
    // 500 lets the gateway retry later; processing is idempotent.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  return handle(req, (await params).provider);
}

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  return handle(req, (await params).provider);
}
