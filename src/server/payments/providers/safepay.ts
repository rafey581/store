// Safepay (card, hosted checkout).
// Endpoints, auth header and webhook signature follow Safepay's official PHP SDK
// (github.com/getsafepay/sfpy-php): POST /order/payments/v3/, POST /client/passport/v1/token,
// GET /reporter/api/v2/payments/{tracker}, header X-SFPY-MERCHANT-SECRET,
// checkout URL {base}/embedded?..., webhook X-SFPY-SIGNATURE = hex HMAC-SHA512(raw body, webhook secret).
// Response field names are parsed defensively; verify them against the sandbox before going live.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { GatewayProvider, VerifiedCallback } from "@/server/payments/types";
import { env, envOr, fetchWithTimeout, isSandbox } from "./util";

const cfg = () => {
  const sandbox = isSandbox("SAFEPAY");
  return {
    sandbox,
    apiBase: envOr("SAFEPAY_API_BASE", sandbox ? "https://sandbox.api.getsafepay.com" : "https://api.getsafepay.com"),
    checkoutBase: envOr("SAFEPAY_CHECKOUT_BASE", sandbox ? "https://sandbox.api.getsafepay.com" : "https://getsafepay.com"),
    apiKey: env("SAFEPAY_API_KEY"), // public "sec_..." merchant API key
    secretKey: env("SAFEPAY_SECRET_KEY"), // merchant secret (X-SFPY-MERCHANT-SECRET)
    webhookSecret: env("SAFEPAY_WEBHOOK_SECRET"),
  };
};

type Json = Record<string, unknown>;
const get = (o: unknown, path: string): unknown => path.split(".").reduce<unknown>((a, k) => (a && typeof a === "object" ? (a as Json)[k] : undefined), o);
const firstString = (o: unknown, paths: string[]) => {
  for (const p of paths) {
    const v = get(o, p);
    if (typeof v === "string" && v) return v;
  }
  return null;
};

async function api(path: string, method: "GET" | "POST", body?: Json): Promise<Json> {
  const c = cfg();
  const res = await fetchWithTimeout(`${c.apiBase}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-SFPY-MERCHANT-SECRET": c.secretKey! },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Safepay ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as Json;
}

const SUCCESS_STATES = new Set(["PAID", "TRACKER_ENDED", "COMPLETED", "CAPTURED", "SUCCEEDED"]);
const FAILED_STATES = new Set(["FAILED", "DECLINED", "CANCELLED", "CANCELED", "EXPIRED"]);

function interpret(tracker: string, data: unknown, source: string, signatureValid: boolean): VerifiedCallback {
  const state = (firstString(data, ["data.state", "state", "data.tracker.state", "tracker.state", "data.status", "status"]) ?? "").toUpperCase();
  const amountRaw = get(data, "data.amount") ?? get(data, "amount") ?? get(data, "data.tracker.amount");
  const amount = typeof amountRaw === "number" && Number.isInteger(amountRaw) ? amountRaw : null; // lowest denomination (paisa)
  const status = SUCCESS_STATES.has(state) ? "SUCCEEDED" : FAILED_STATES.has(state) ? "FAILED" : "PENDING";
  return { signatureValid, reference: null, providerTxnId: tracker, status, amountPaisa: amount, eventKey: `${source}:${tracker}:${status}`, payload: data };
}

export const safepay: GatewayProvider = {
  method: "SAFEPAY",
  label: "Card (Safepay)",
  isConfigured() {
    const c = cfg();
    return Boolean(c.apiKey && c.secretKey && c.webhookSecret);
  },

  async initiate(ctx) {
    const c = cfg();
    const setup = await api("/order/payments/v3/", "POST", { merchant_api_key: c.apiKey, intent: "CYBERSOURCE", mode: "payment", currency: "PKR", amount: ctx.payment.amountPaisa });
    const tracker = firstString(setup, ["data.tracker.token", "tracker.token", "data.token"]);
    if (!tracker) throw new Error("Safepay: no tracker token in response");
    const passport = await api("/client/passport/v1/token", "POST");
    const tbt = firstString(passport, ["data", "token", "data.token"]);
    if (!tbt) throw new Error("Safepay: no passport token in response");
    const qs = new URLSearchParams({
      environment: c.sandbox ? "sandbox" : "production",
      tracker,
      source: "custom",
      tbt,
      redirect_url: ctx.returnUrl,
      cancel_url: `${ctx.returnUrl}&cancelled=1`,
      order_id: String(ctx.order.number),
    });
    return { type: "redirect", url: `${c.checkoutBase}/embedded?${qs}`, providerData: { tracker }, providerTxnId: tracker };
  },

  async verifyCallback({ rawBody, headers }) {
    const c = cfg();
    const sig = headers.get("x-sfpy-signature") ?? "";
    const expected = createHmac("sha512", c.webhookSecret ?? "").update(rawBody, "utf8").digest("hex");
    const signatureValid = Boolean(c.webhookSecret) && sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    let body: Json = {};
    try {
      body = JSON.parse(rawBody) as Json;
    } catch {}
    const type = String(body.type ?? "");
    const tracker = firstString(body, ["data.tracker", "data.tracker.token", "data.token", "tracker"]);
    const eventId = firstString(body, ["token", "id", "data.id"]) ?? `${type}:${tracker}`;
    if (!signatureValid || !tracker) return { signatureValid, reference: null, providerTxnId: tracker, status: "PENDING", amountPaisa: null, eventKey: `wh:${eventId}:${Date.now()}`, payload: body };
    if (type === "payment.failed") return { signatureValid, reference: null, providerTxnId: tracker, status: "FAILED", amountPaisa: null, eventKey: `wh:${eventId}`, payload: body, message: "Card payment failed" };
    if (type !== "payment.succeeded") return { signatureValid, reference: null, providerTxnId: tracker, status: "PENDING", amountPaisa: null, eventKey: `wh:${eventId}`, payload: body };
    // Signed success event: confirm amount and state with Safepay's reporter API.
    const confirmed = await safepay.queryStatus!("", { amountPaisa: 0, createdAt: new Date(), providerTxnId: tracker }).catch(() => null);
    const amountInEvent = get(body, "data.amount");
    const amountPaisa = confirmed?.amountPaisa ?? (typeof amountInEvent === "number" && Number.isInteger(amountInEvent) ? amountInEvent : null);
    return { signatureValid, reference: null, providerTxnId: tracker, status: "SUCCEEDED", amountPaisa, eventKey: `wh:${eventId}`, payload: body };
  },

  async queryStatus(_reference, payment) {
    if (!payment.providerTxnId) return null;
    const data = await api(`/reporter/api/v2/payments/${encodeURIComponent(payment.providerTxnId)}`, "GET");
    return interpret(payment.providerTxnId, data, "query", true);
  },
};
