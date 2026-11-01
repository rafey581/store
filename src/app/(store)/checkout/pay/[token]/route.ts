import { NextResponse } from "next/server";
import { initiateGatewayPayment, PaymentError } from "@/server/payments";
import { rateLimit, ipFromHeaders } from "@/server/rate-limit";
import { siteUrl } from "@/lib/utils";
import { autoPostHtml } from "@/server/payments/http";
import type { PaymentMethod } from "@/generated/prisma/enums";

const GATEWAYS = ["SAFEPAY", "PAYFAST", "JAZZCASH", "EASYPAISA"] as const;


export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const method = new URL(req.url).searchParams.get("method") as PaymentMethod | null;
  const back = (error?: string) => NextResponse.redirect(siteUrl(`/order/${encodeURIComponent(token)}${error ? `?error=${encodeURIComponent(error)}` : ""}`), 303);
  if (!method || !(GATEWAYS as readonly string[]).includes(method)) return back("Unknown payment method.");
  if (!(await rateLimit(`pay:${ipFromHeaders(req.headers)}`, 20, 600))) return back("Too many payment attempts. Please wait a few minutes.");
  try {
    const result = await initiateGatewayPayment(token, method);
    if (result.type === "redirect") return NextResponse.redirect(result.url, 303);
    const html = autoPostHtml(result.action, result.fields, "Redirecting you to the secure payment page…");
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (e) {
    return back(e instanceof PaymentError ? e.message : "Could not start the payment.");
  }
}
