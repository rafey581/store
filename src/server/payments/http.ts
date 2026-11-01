import type { PaymentMethod } from "@/generated/prisma/enums";

export const PROVIDER_SLUGS: Record<string, Exclude<PaymentMethod, "MANUAL_TRANSFER">> = {
  safepay: "SAFEPAY",
  payfast: "PAYFAST",
  jazzcash: "JAZZCASH",
  easypaisa: "EASYPAISA",
};

export const escHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function autoPostHtml(action: string, fields: Record<string, string>, message = "Redirecting…") {
  const inputs = Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${escHtml(k)}" value="${escHtml(v)}">`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escHtml(message)}</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:48px"><p>${escHtml(message)}</p>
<form id="f" method="POST" action="${escHtml(action)}">${inputs}<noscript><button type="submit">Continue</button></noscript></form>
<script>document.getElementById("f").submit();</script></body></html>`;
}
