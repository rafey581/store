// PayFast Pakistan (APPS, card / bank account, hosted checkout).
// NOTE: written from PayFast's published merchant integration format
// (GetAccessToken -> PostTransaction form -> server-to-server notification on
// CHECKOUT_URL with validation_hash); the official docs were not reachable while
// building. Verify field names against your PayFast merchant guide and UAT.
//
// validation_hash = hex SHA-256("basket_id|secured_key|merchant_id|err_code")
// Only the server-to-server notification (CHECKOUT_URL) can mark an order paid;
// browser redirects to SUCCESS_URL/FAILURE_URL are display-only.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { GatewayProvider } from "@/server/payments/types";
import { env, envOr, fetchWithTimeout, isSandbox, paisaToRupeeString, parseBody, pkParts, redact, rupeeStringToPaisa } from "./util";

const cfg = () => {
  const sandbox = isSandbox("PAYFAST");
  const base = envOr("PAYFAST_API_BASE", sandbox ? "https://ipguat.apps.net.pk" : "https://ipg1.apps.net.pk");
  return {
    merchantId: env("PAYFAST_MERCHANT_ID"),
    securedKey: env("PAYFAST_SECURED_KEY"),
    merchantName: env("PAYFAST_MERCHANT_NAME") ?? "Store",
    tokenUrl: envOr("PAYFAST_TOKEN_URL", `${base}/Ecommerce/api/Transaction/GetAccessToken`),
    postUrl: envOr("PAYFAST_POST_URL", `${base}/Ecommerce/api/Transaction/PostTransaction`),
  };
};

export function payfastValidationHash(basketId: string, securedKey: string, merchantId: string, errCode: string) {
  return createHash("sha256").update(`${basketId}|${securedKey}|${merchantId}|${errCode}`, "utf8").digest("hex");
}

export const payfast: GatewayProvider = {
  method: "PAYFAST",
  label: "Card (PayFast)",
  isConfigured() {
    const c = cfg();
    return Boolean(c.merchantId && c.securedKey);
  },

  async initiate(ctx) {
    const c = cfg();
    const amount = paisaToRupeeString(ctx.payment.amountPaisa);
    const res = await fetchWithTimeout(c.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ MERCHANT_ID: c.merchantId!, SECURED_KEY: c.securedKey!, BASKET_ID: ctx.payment.reference, TXNAMT: amount, CURRENCY_CODE: "PKR" }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`PayFast token ${res.status}: ${text.slice(0, 200)}`);
    const json = JSON.parse(text) as { ACCESS_TOKEN?: string };
    if (!json.ACCESS_TOKEN) throw new Error("PayFast: no ACCESS_TOKEN");
    const d = pkParts(new Date());
    const fields: Record<string, string> = {
      MERCHANT_ID: c.merchantId!,
      MERCHANT_NAME: c.merchantName,
      TOKEN: json.ACCESS_TOKEN,
      PROCCODE: "00",
      TXNAMT: amount,
      CURRENCY_CODE: "PKR",
      CUSTOMER_MOBILE_NO: ctx.order.phone,
      CUSTOMER_EMAIL_ADDRESS: ctx.order.email,
      SIGNATURE: randomBytes(12).toString("hex"),
      VERSION: "MERCHANT-CART-0.1",
      TXNDESC: `Order ${ctx.order.number}`,
      SUCCESS_URL: ctx.returnUrl,
      FAILURE_URL: `${ctx.returnUrl}&failed=1`,
      BASKET_ID: ctx.payment.reference,
      ORDER_DATE: `${d.y}-${d.m}-${d.d} ${d.H}:${d.M}:${d.S}`,
      CHECKOUT_URL: ctx.callbackUrl,
      TRAN_TYPE: "ECOMM_PURCHASE",
    };
    return { type: "form", action: c.postUrl, fields, providerData: { basketId: ctx.payment.reference } };
  },

  async verifyCallback({ rawBody, contentType, query }) {
    const c = cfg();
    const b = { ...Object.fromEntries(query), ...parseBody(rawBody, contentType) };
    const basket = b.basket_id || b.BASKET_ID || null;
    const err = b.err_code ?? "";
    const given = (b.validation_hash ?? "").toLowerCase();
    const expected = basket && c.securedKey ? payfastValidationHash(basket, c.securedKey, c.merchantId!, err) : "";
    const signatureValid = Boolean(expected && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected)));
    const status = err === "000" || err === "00" ? "SUCCEEDED" : err ? "FAILED" : "PENDING";
    const amt = rupeeStringToPaisa(b.transaction_amount ?? b.merchant_amount);
    return {
      signatureValid,
      reference: basket,
      providerTxnId: b.transaction_id || null,
      status,
      // Fails closed: if PayFast does not report the amount, the payment is not auto-applied (admin can verify it).
      amountPaisa: amt,
      eventKey: `cb:${basket}:${b.transaction_id ?? ""}:${err}`,
      payload: redact(b),
      message: b.err_msg,
    };
  },
};
