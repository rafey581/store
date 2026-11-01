// JazzCash (mobile wallet / hosted "page redirection", API v1.1).
// NOTE: written from JazzCash's published v1.1 integration format; the official
// sandbox docs were not reachable while building. Verify against your JazzCash
// merchant integration guide and the sandbox before going live. URLs can be
// overridden with environment variables without code changes.
//
// pp_SecureHash = uppercase hex HMAC-SHA256(key = integrity salt,
//   message = salt + "&" + values of all non-empty "pp*" fields sorted by field name, joined by "&")
// The browser return is never trusted: payments are confirmed with the
// server-to-server Payment Inquiry API.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { GatewayProvider, VerifiedCallback } from "@/server/payments/types";
import { env, envOr, fetchWithTimeout, isSandbox, parseBody, pkParts, redact } from "./util";

const cfg = () => {
  const sandbox = isSandbox("JAZZCASH");
  const host = sandbox ? "https://sandbox.jazzcash.com.pk" : "https://payments.jazzcash.com.pk";
  return {
    merchantId: env("JAZZCASH_MERCHANT_ID"),
    password: env("JAZZCASH_PASSWORD"),
    salt: env("JAZZCASH_INTEGRITY_SALT"),
    formUrl: envOr("JAZZCASH_FORM_URL", `${host}/CustomerPortal/transactionmanagement/merchantform/`),
    inquiryUrl: envOr("JAZZCASH_INQUIRY_URL", `${host}/ApplicationAPI/API/PaymentInquiry/Inquire`),
    txnType: env("JAZZCASH_TXN_TYPE") ?? "", // "" lets the hosted page offer all options; "MWALLET" for wallet only
  };
};

export function jazzcashHash(fields: Record<string, string>, salt: string): string {
  const keys = Object.keys(fields)
    .filter((k) => k.toLowerCase().startsWith("pp") && k !== "pp_SecureHash" && fields[k] !== "" && fields[k] !== undefined)
    .sort();
  const message = [salt, ...keys.map((k) => fields[k])].join("&");
  return createHmac("sha256", salt).update(message, "utf8").digest("hex").toUpperCase();
}

function safeEq(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const fmt = (d: Date) => {
  const p = pkParts(d);
  return `${p.y}${p.m}${p.d}${p.H}${p.M}${p.S}`;
};

// Payment response codes: 000 / 121 success; 124 / 157 pending (voucher / awaiting customer).
const SUCCESS = new Set(["000", "121"]);
const PENDING = new Set(["124", "157", "210"]);

export const jazzcash: GatewayProvider = {
  method: "JAZZCASH",
  label: "JazzCash",
  isConfigured() {
    const c = cfg();
    return Boolean(c.merchantId && c.password && c.salt);
  },

  async initiate(ctx) {
    const c = cfg();
    const now = new Date();
    const fields: Record<string, string> = {
      pp_Version: "1.1",
      pp_TxnType: c.txnType,
      pp_Language: "EN",
      pp_MerchantID: c.merchantId!,
      pp_SubMerchantID: "",
      pp_Password: c.password!,
      pp_BankID: "",
      pp_ProductID: "",
      pp_TxnRefNo: ctx.payment.reference,
      pp_Amount: String(ctx.payment.amountPaisa), // JazzCash amounts are in paisa (last two digits are decimals)
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: fmt(now),
      pp_BillReference: `order${ctx.order.number}`,
      pp_Description: `Order ${ctx.order.number}`,
      pp_TxnExpiryDateTime: fmt(new Date(now.getTime() + 60 * 60_000)),
      pp_ReturnURL: ctx.returnUrl,
      ppmpf_1: ctx.order.phone,
      ppmpf_2: "",
      ppmpf_3: "",
      ppmpf_4: "",
      ppmpf_5: "",
    };
    fields.pp_SecureHash = jazzcashHash(fields, c.salt!);
    return { type: "form", action: c.formUrl, fields, providerData: { txnRefNo: ctx.payment.reference } };
  },

  // IPN / callback posted by JazzCash: verify the hash, then confirm with the Inquiry API.
  async verifyCallback({ rawBody, contentType, query }) {
    const c = cfg();
    const body = { ...Object.fromEntries(query), ...parseBody(rawBody, contentType) };
    const ref = body.pp_TxnRefNo ?? null;
    const given = (body.pp_SecureHash ?? "").toUpperCase();
    const signatureValid = Boolean(c.salt && given && safeEq(jazzcashHash(body, c.salt!), given));
    if (!signatureValid || !ref) return { signatureValid, reference: ref, providerTxnId: null, status: "PENDING", amountPaisa: null, eventKey: `cb:${ref}:${Date.now()}`, payload: redact(body) };
    const confirmed = await jazzcash.queryStatus!(ref, { amountPaisa: Number(body.pp_Amount) || 0, createdAt: new Date(), providerTxnId: null });
    return confirmed ?? { signatureValid, reference: ref, providerTxnId: null, status: "PENDING", amountPaisa: null, eventKey: `cb:${ref}:unconfirmed:${Date.now()}`, payload: redact(body) };
  },

  async queryStatus(reference, payment): Promise<VerifiedCallback | null> {
    const c = cfg();
    const req: Record<string, string> = { pp_TxnRefNo: reference, pp_MerchantID: c.merchantId!, pp_Password: c.password! };
    req.pp_SecureHash = jazzcashHash(req, c.salt!);
    const res = await fetchWithTimeout(c.inquiryUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
    const text = await res.text();
    if (!res.ok) throw new Error(`JazzCash inquiry ${res.status}: ${text.slice(0, 200)}`);
    const data = JSON.parse(text) as Record<string, string>;
    // Verify the response hash when present.
    if (data.pp_SecureHash) {
      const ok = safeEq(jazzcashHash(data, c.salt!), String(data.pp_SecureHash).toUpperCase());
      if (!ok) return { signatureValid: false, reference, providerTxnId: null, status: "PENDING", amountPaisa: null, eventKey: `q:${reference}:badsig:${Date.now()}`, payload: redact(data) };
    }
    const inquiryOk = data.pp_ResponseCode === "000";
    const payCode = String(data.pp_PaymentResponseCode ?? "");
    const statusText = String(data.pp_Status ?? "").toLowerCase();
    let status: VerifiedCallback["status"] = "PENDING";
    if (inquiryOk && (SUCCESS.has(payCode) || statusText === "completed")) status = "SUCCEEDED";
    else if (inquiryOk && (PENDING.has(payCode) || statusText === "pending" || payCode === "")) status = "PENDING";
    else if (inquiryOk) status = "FAILED";
    // Amount: from the inquiry response if returned, otherwise the amount we signed in the request.
    const amt = data.pp_Amount && /^\d+$/.test(String(data.pp_Amount)) ? Number(data.pp_Amount) : payment.amountPaisa || null;
    return { signatureValid: true, reference, providerTxnId: data.pp_RetreivalReferenceNo || data.pp_TxnRefNo || null, status, amountPaisa: amt, eventKey: `q:${reference}:${status}`, payload: redact(data), message: data.pp_ResponseMessage };
  },
};
