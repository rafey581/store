// Easypaisa (Easypay hosted checkout).
// NOTE: written from Easypay's published hosted-checkout format (Index.jsf ->
// postBackURL with auth_token -> Confirm.jsf -> postBackURL with status); the
// official staging docs were not reachable while building. Verify against your
// Easypay merchant integration pack and the staging environment before going live.
//
// merchantHashedReq = base64(AES-128-ECB/PKCS5(key = hash key, text = non-empty
//   request fields sorted by name as "k=v&k=v")).
// Payments are confirmed only with the server-to-server inquire-transaction API.

import { createCipheriv } from "node:crypto";
import type { GatewayProvider, VerifiedCallback } from "@/server/payments/types";
import { env, envOr, fetchWithTimeout, isSandbox, paisaToRupeeString, parseBody, pkParts, redact, rupeeStringToPaisa } from "./util";

const cfg = () => {
  const sandbox = isSandbox("EASYPAISA");
  const host = sandbox ? "https://easypaystg.easypaisa.com.pk" : "https://easypay.easypaisa.com.pk";
  return {
    storeId: env("EASYPAISA_STORE_ID"),
    hashKey: env("EASYPAISA_HASH_KEY"),
    username: env("EASYPAISA_USERNAME"),
    password: env("EASYPAISA_PASSWORD"),
    accountNum: env("EASYPAISA_ACCOUNT_NUM") ?? "",
    indexUrl: envOr("EASYPAISA_INDEX_URL", `${host}/easypay/Index.jsf`),
    confirmUrl: envOr("EASYPAISA_CONFIRM_URL", `${host}/easypay/Confirm.jsf`),
    inquiryUrl: envOr("EASYPAISA_INQUIRY_URL", `${host}/easypay-service/rest/v4/inquire-transaction`),
    paymentMethod: env("EASYPAISA_PAYMENT_METHOD") ?? "MA_PAYMENT_METHOD", // MA_ (wallet), CC_ (card), OTC_
  };
};

export function easypaisaHash(fields: Record<string, string>, key: string): string {
  const text = Object.keys(fields)
    .filter((k) => fields[k] !== "" && fields[k] !== undefined)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("&");
  const keyBuf = Buffer.from(key, "utf8");
  if (keyBuf.length !== 16) throw new Error("EASYPAISA_HASH_KEY must be 16 characters (AES-128)");
  const cipher = createCipheriv("aes-128-ecb", keyBuf, null);
  return Buffer.concat([cipher.update(text, "utf8"), cipher.final()]).toString("base64");
}

export const easypaisa: GatewayProvider & { confirmForm(authToken: string, postBackURL: string): { action: string; fields: Record<string, string> } } = {
  method: "EASYPAISA",
  label: "Easypaisa",
  isConfigured() {
    const c = cfg();
    return Boolean(c.storeId && c.hashKey && c.username && c.password);
  },

  async initiate(ctx) {
    const c = cfg();
    const exp = pkParts(new Date(Date.now() + 60 * 60_000));
    const fields: Record<string, string> = {
      amount: paisaToRupeeString(ctx.payment.amountPaisa, 1),
      autoRedirect: "1",
      emailAddr: ctx.order.email,
      expiryDate: `${exp.y}${exp.m}${exp.d} ${exp.H}${exp.M}${exp.S}`,
      mobileNum: ctx.order.phone,
      orderRefNum: ctx.payment.reference,
      paymentMethod: c.paymentMethod,
      postBackURL: ctx.returnUrl,
      storeId: c.storeId!,
    };
    fields.merchantHashedReq = easypaisaHash(fields, c.hashKey!);
    return { type: "form", action: c.indexUrl, fields, providerData: { orderRefNum: ctx.payment.reference } };
  },

  /** Step 2 of the hosted flow: post the auth_token back to Confirm.jsf. */
  confirmForm(authToken, postBackURL) {
    return { action: cfg().confirmUrl, fields: { auth_token: authToken, postBackURL } };
  },

  // IPN: Easypay notifies the configured IPN URL. We never trust its content —
  // we read the order reference and confirm with the inquiry API.
  async verifyCallback({ rawBody, contentType, query }) {
    const body = { ...Object.fromEntries(query), ...parseBody(rawBody, contentType) };
    let ref = body.orderRefNum || body.orderRefNumber || body.order_id || body.orderId || null;
    if (!ref && body.url) ref = decodeURIComponent(String(body.url)).split("/").filter(Boolean).pop() ?? null;
    if (!ref || !/^[A-Za-z0-9-]{4,40}$/.test(ref)) return { signatureValid: false, reference: null, providerTxnId: null, status: "PENDING", amountPaisa: null, eventKey: `ipn:invalid:${Date.now()}`, payload: redact(body) };
    const confirmed = await easypaisa.queryStatus!(ref, { amountPaisa: 0, createdAt: new Date(), providerTxnId: null });
    return confirmed ?? { signatureValid: false, reference: ref, providerTxnId: null, status: "PENDING", amountPaisa: null, eventKey: `ipn:${ref}:unconfirmed:${Date.now()}`, payload: redact(body) };
  },

  async queryStatus(reference): Promise<VerifiedCallback | null> {
    const c = cfg();
    const credentials = Buffer.from(`${c.username}:${c.password}`).toString("base64");
    const res = await fetchWithTimeout(c.inquiryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Credentials: credentials },
      body: JSON.stringify({ orderId: reference, storeId: c.storeId, accountNum: c.accountNum }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Easypaisa inquiry ${res.status}: ${text.slice(0, 200)}`);
    const data = JSON.parse(text) as Record<string, unknown>;
    const ok = String(data.responseCode ?? "") === "0000";
    const st = String(data.transactionStatus ?? "").toUpperCase();
    const status: VerifiedCallback["status"] = ok && st === "PAID" ? "SUCCEEDED" : ok && ["FAILED", "REVERSED", "EXPIRED", "DROPPED"].includes(st) ? "FAILED" : "PENDING";
    return {
      signatureValid: true, // authenticated server-to-server request
      reference,
      providerTxnId: data.transactionId ? String(data.transactionId) : null,
      status,
      amountPaisa: rupeeStringToPaisa(data.transactionAmount),
      eventKey: `q:${reference}:${status}`,
      payload: redact(data),
      message: String(data.responseDesc ?? ""),
    };
  },
};
