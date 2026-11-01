# Payments

All payment code lives in `src/server/payments/`. One module, five methods:

| Method | Type | Provider file |
|---|---|---|
| Safepay | Card, hosted checkout | `providers/safepay.ts` |
| PayFast | Card / bank account, hosted checkout | `providers/payfast.ts` |
| JazzCash | Mobile wallet, hosted page | `providers/jazzcash.ts` |
| Easypaisa | Mobile wallet, hosted page | `providers/easypaisa.ts` |
| Bank / wallet transfer | Screenshot + transaction ID, admin review | `index.ts` (`submitProof`, `approveProof`, `rejectProof`) |

## Safety rules (how they are enforced)

1. **Amounts are computed on the server.** `placeOrder()` re-reads prices from the database. The amount sent to a gateway is `Payment.amountPaisa`, copied from the order on the server.
2. **The browser redirect never marks an order paid.** `/api/payments/{provider}/return` only calls `reconcilePayment()`, which asks the gateway server-to-server for the status. Then it shows the order page.
3. **Only two code paths can set PAID**, both through `markOrderPaid()`:
   - `handleGatewayCallback()`, after the signature or server-to-server query is verified **and** the paid amount equals `Payment.amountPaisa`;
   - `approveProof()` (a staff member approves a transfer proof) or `approveGatewayPaymentManually()` (the Owner, after checking the gateway portal).
4. **Callbacks are idempotent.** Each callback is first stored in `PaymentEvent` with a unique `(method, eventKey)`. A replay returns `duplicate`. `markOrderPaid()` locks the order row (`SELECT … FOR UPDATE`) and does nothing if the order is already paid.
5. **Unpaid orders expire.** `/api/cron/expire-orders` (every 15 min via `vercel.json`) marks `PENDING_PAYMENT` orders past `expiresAt` as `EXPIRED`, returns stock and frees the coupon. If a gateway confirms payment after expiry, the order is still marked paid and stock is re-reserved if available. Otherwise an internal note tells staff to contact the customer or refund.
6. **Keys live only in environment variables** (see `.env.example`). Store settings only switch methods on or off. A method appears at checkout only when it is switched on **and** its keys are present.

## Callback / return URLs to register with each gateway

Replace `https://yourstore.pk` with `NEXT_PUBLIC_SITE_URL`.

| Gateway | Server-to-server notification URL | Customer return URL |
|---|---|---|
| Safepay | Webhook endpoint: `https://yourstore.pk/api/payments/safepay/callback` (events: payment.succeeded, payment.failed) | sent automatically per payment |
| PayFast | sent automatically as `CHECKOUT_URL`: `…/api/payments/payfast/callback` | sent automatically (`SUCCESS_URL` / `FAILURE_URL`) |
| JazzCash | IPN URL in the merchant portal: `…/api/payments/jazzcash/callback` | sent automatically (`pp_ReturnURL`) |
| Easypaisa | IPN URL in the merchant portal: `…/api/payments/easypaisa/callback` | sent automatically (`postBackURL`) |

The cron job also asks Safepay, JazzCash and Easypaisa about pending attempts from the last 48 hours, so a missed notification is picked up automatically. PayFast has no status query in this build. A missed PayFast notification needs the Owner to use **Verify manually** on the order page.

## Verification status: read before going live

The official gateway documentation sites and sandboxes (`docs.getsafepay.com`, `gopayfast.com`, `sandbox.jazzcash.com.pk`, `easypaystg.easypaisa.com.pk`) **could not be reached from the build environment**. What was and was not verified:

| Gateway | Source used | Tested against the real sandbox? |
|---|---|---|
| Safepay | Safepay's official PHP SDK source (github.com/getsafepay/sfpy-php): endpoints `/order/payments/v3/`, `/client/passport/v1/token`, `/reporter/api/v2/payments/{tracker}`, header `X-SFPY-MERCHANT-SECRET`, checkout `/embedded?…`, webhook `X-SFPY-SIGNATURE` = HMAC-SHA512 of the raw body | **No.** Response field names (tracker token, state, amount) are parsed defensively and must be confirmed. |
| PayFast | Published merchant integration format (GetAccessToken → PostTransaction → CHECKOUT_URL notification with `validation_hash`) | **No** |
| JazzCash | Published Page Redirection v1.1 format, HMAC-SHA256 `pp_SecureHash`, Payment Inquiry API | **No** |
| Easypaisa | Published Easypay hosted checkout (Index.jsf → Confirm.jsf), AES-128-ECB `merchantHashedReq`, inquire-transaction API | **No** |

All four flows **were** tested end to end against a local mock of each protocol as implemented. Covered: payment start, signed notification, replay (duplicate ignored), forged signature (rejected), wrong amount (not applied), and a fake "success" return without payment (not applied). This proves the store's own logic, not compatibility with the real gateways.

**Before going live, for each gateway:** get sandbox credentials, set the env vars, switch the method on in Store settings, place a sandbox order, and confirm that (a) the hosted page opens, (b) the order becomes Paid, and (c) the payment event in the admin order page shows `applied`. If field names differ from your merchant guide, the provider file is the only place to change, and endpoint URLs can be overridden with env vars.
