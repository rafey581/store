import { NextResponse } from "next/server";
import { initiateGatewayPayment, PaymentError } from "@/server/payments";
import { rateLimit, ipFromHeaders } from "@/server/rate-limit";
import { siteUrl } from "@/lib/utils";
import type { PaymentMethod } from "@/generated/prisma/enums";

const GATEWAYS = ["SAFEPAY", "PAYFAST", "JAZZCASH", "EASYPAISA"] as const;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const method = new URL(req.url).searchParams.get("method") as PaymentMethod | null;
  const back = (error?: string) => NextResponse.redirect(siteUrl(`/order/${encodeURIComponent(token)}${error ? `?error=${encodeURIComponent(error)}` : ""}`), 303);
  if (!method || !(GATEWAYS as readonly string[]).includes(method)) return back("Unknown payment method.");
  if (!(await rateLimit(`pay:${ipFromHeaders(req.headers)}`, 20, 600))) return back("Too many payment attempts. Please wait a few minutes.");
  try {
    const result = await initiateGatewayPayment(token, method);
    if (result.type === "redirect") return NextResponse.redirect(result.url, 303);
    const inputs = Object.entries(result.fields).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Redirecting to payment…</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:48px">
<p>Redirecting you to the secure payment page…</p>
<form id="f" method="POST" action="${esc(result.action)}">${inputs}<noscript><button type="submit">Continue to payment</button></noscript></form>
<script>document.getElementById("f").submit();</script></body></html>`;
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (e) {
    return back(e instanceof PaymentError ? e.message : "Could not start the payment.");
  }
}
