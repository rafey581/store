# Store

E-commerce website for selling physical products in Pakistan. Prices in PKR (stored as integer paisa), mobile-first storefront, admin panel, five payment methods.

- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL (Supabase) · Prisma 7 · Zod · Auth.js
- **Docs:** [Architecture](docs/ARCHITECTURE.md) · [Payments and go-live checklist](docs/PAYMENTS.md) · [Android admin app](docs/MOBILE.md) · [Deploy on AWS EC2](docs/DEPLOY-EC2.md) · [Build the APK](docs/APK-PROMPT.md)

| Status | |
|---|---|
| Phase 1: schema, auth, catalog, admin products | Done |
| Phase 2: cart, checkout, manual transfers, orders admin, emails | Done |
| Phase 3: Safepay, PayFast, JazzCash, Easypaisa | Built; **not yet tested against the real sandboxes** (see docs/PAYMENTS.md) |
| Phase 4: Android admin app (Expo, `mobile/`) | Built; API and screens tested. APK build and push need your Expo/Firebase accounts (see docs/MOBILE.md) |

## Features

**Storefront:** home page with editable hero and announcement bar · categories and sub-categories · search with price / in-stock filters and sorting · product pages with variants, image gallery, related products · cart and coupons · guest or account checkout · shipping fee by city with free-shipping threshold · order tracking page and order lookup · customer self-cancel for unpaid orders · customer account (orders, addresses, password) · editable About / Contact / policy pages · WhatsApp chat button · SEO (metadata, sitemap, robots, Product / Breadcrumb / OnlineStore structured data) · mobile-first layout.

**Payments:** Safepay and PayFast (card), JazzCash and Easypaisa (wallet), bank / wallet transfer with screenshot proof, and cash on delivery (optional COD fee and order limit). One payment module; orders become Paid only from a verified server-side callback or a staff action.

**Admin (`/admin`):** dashboard (sales, orders, pending proofs, to ship, low stock, live / today / total visitors, 14-day chart) · products with images, options and variants · categories · orders with status history, tracking numbers, printable invoice and CSV export · payment proof review · cash-on-delivery collection · customers · coupons · shipping rates · store settings · content pages · staff roles (Owner, Staff) · activity log · Help for Developer.

**Android admin app:** dashboard, orders, proof review, cash collection, quick product edit, push notifications for new orders and proofs.

---

## 1. Run it locally

Requirements: Node.js 20+ and PostgreSQL 15+ (local, Docker, or a Supabase project).

```bash
git clone https://github.com/rafey581/store.git
```

```bash
cd store
```

```bash
npm install
```

Create `.env` from the template and fill in at least the database and app values:

```bash
cp .env.example .env
```

For a purely local setup:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/store"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/store"
AUTH_SECRET="any-long-random-string-at-least-32-chars"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
CRON_SECRET="dev-cron-secret"
MOBILE_JWT_SECRET="another-long-random-string-32-chars-min"
ALLOW_LOCAL_STORAGE="1"
```

Create the tables and demo data:

```bash
npx prisma migrate deploy
```

```bash
npm run db:seed
```

The seed prints the owner login: **owner@example.com / ChangeMe123!**. A demo staff account `staff@example.com / ChangeMe123!` is also created. Set `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` to choose your own; set `SEED_DEMO=false` to skip demo products, the staff account and the coupon.

Start the app:

```bash
npm run dev
```

Store: http://localhost:3000 · Admin: http://localhost:3000/admin

Without `RESEND_API_KEY`, emails are printed to the server console and logged as "not configured". Without Supabase keys and with `ALLOW_LOCAL_STORAGE=1`, uploads are saved under `.data/`.

## 2. Test it

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run lint
```

### Manual test script (about 10 minutes)

1. **Catalog (Phase 1):** sign in as the owner → Admin → Products → **Add product**. Upload an image, add a "Size" option with values `M, L`, click **Update variants from options**, enter prices and stock, set status Active and save. Open the product in the store and switch variants; the price and stock should change.
2. **Checkout + manual transfer (Phase 2):** in a private window, add 2 items to the cart, apply coupon `WELCOME10` (needs a subtotal of Rs 2,000+), check out as a guest with city `Lahore`. On the order page, upload any JPG/PNG as the payment proof with a transaction ID.
3. **Review:** as staff/owner open Admin → **Payment proofs** → **Approve payment**. The order becomes Paid and the customer gets the "payment confirmed" email (console in dev).
4. **Ship:** open the order → New status **Shipped** with courier + tracking number. The customer's order page shows the tracking number and the full status history.
5. **Expiry:** place another order and don't pay. Then run the cron job (or wait for `expiresAt`). The order becomes Expired and stock returns (see Products).
   ```bash
   curl -H "Authorization: Bearer dev-cron-secret" http://localhost:3000/api/cron/expire-orders
   ```
6. **Roles:** sign in as `staff@example.com`. Store settings and Staff are hidden and blocked on the server (`/admin/settings` redirects with "You do not have permission").
7. **Cash on delivery:** as the owner, enable "Cash on delivery" in Store settings (optionally set a COD fee). Place an order choosing Cash on delivery: it goes straight to Processing. In the admin order page, mark it Shipped, then click **Mark cash collected**; the order becomes Paid and stays Shipped.
8. **Pages and invoice:** Admin → Pages lets the owner edit About / Contact / policy pages (they appear in the footer). On any order, **Print invoice** opens a printable invoice; Orders → **Export CSV** downloads orders for accounting or courier booking.
9. **Customer cancel:** open an unpaid order's page as the customer and click **Cancel this order**; stock and coupon are released.

### Testing payments locally (mock gateways)

`scripts/mock-gateways.js` imitates the four gateway protocols **as implemented in this code**, so the full flow can be exercised without real accounts. It does not prove compatibility with the real gateways.

```bash
node scripts/mock-gateways.js
```

Add to `.env`, restart the app, then switch the methods on in Admin → Store settings:

```env
SAFEPAY_API_KEY="sec_test"
SAFEPAY_SECRET_KEY="spsecret"
SAFEPAY_WEBHOOK_SECRET="spwebhooksecret"
SAFEPAY_API_BASE="http://localhost:4010"
SAFEPAY_CHECKOUT_BASE="http://localhost:4010"
JAZZCASH_MERCHANT_ID="MC123"
JAZZCASH_PASSWORD="jcpass"
JAZZCASH_INTEGRITY_SALT="jcsalt1234"
JAZZCASH_FORM_URL="http://localhost:4010/jc/form"
JAZZCASH_INQUIRY_URL="http://localhost:4010/jc/inquiry"
EASYPAISA_STORE_ID="1234"
EASYPAISA_HASH_KEY="0123456789abcdef"
EASYPAISA_USERNAME="epuser"
EASYPAISA_PASSWORD="eppass"
EASYPAISA_INDEX_URL="http://localhost:4010/ep/index"
EASYPAISA_CONFIRM_URL="http://localhost:4010/ep/confirm"
EASYPAISA_INQUIRY_URL="http://localhost:4010/ep/inquiry"
PAYFAST_MERCHANT_ID="102"
PAYFAST_SECURED_KEY="pfsecuredkey"
PAYFAST_TOKEN_URL="http://localhost:4010/pf/token"
PAYFAST_POST_URL="http://localhost:4010/pf/post"
```

Pick a gateway at checkout. The order should come back as **Paid**, and the admin order page shows the payment event `applied`.

## 3. Deploy (Supabase + Vercel)

1. **Supabase:** create a project. In *Project Settings → Database* copy the pooled connection string (port 6543, add `?pgbouncer=true`) into `DATABASE_URL` and the direct one (port 5432) into `DIRECT_URL`.
2. **Storage:** in *Storage*, create a **public** bucket `product-images` and a **private** bucket `payment-proofs`. Copy the project URL and the `service_role` key into `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. Keep this key server-side only.
3. **Migrate and seed** from your machine with the production env values:
   ```bash
   npx prisma migrate deploy
   ```
   ```bash
   SEED_OWNER_EMAIL=you@yourstore.pk SEED_OWNER_PASSWORD='a-strong-password' SEED_DEMO=false npm run db:seed
   ```
4. **Vercel:** import the GitHub repo and add every variable from `.env.example` (do **not** set `ALLOW_LOCAL_STORAGE`). The build command is `npm run build`. `vercel.json` schedules `/api/cron/expire-orders` every 15 minutes. Vercel's Hobby plan only allows daily cron jobs, so on Hobby use an external scheduler (e.g. cron-job.org) to call that URL with the `Authorization: Bearer $CRON_SECRET` header.
5. **Email:** create a Resend account, verify your domain, and set `RESEND_API_KEY` and `EMAIL_FROM`.
6. **Payments:** follow the go-live checklist in [docs/PAYMENTS.md](docs/PAYMENTS.md).
7. **Help for Developer:** set `NEXT_PUBLIC_DEVELOPER_SOLANA_ADDRESS`.

## 4. Project layout

```
prisma/            schema, migrations, seed
src/app/(store)/   storefront pages (home, category, product, cart, checkout, order, account, auth)
src/app/admin/     admin panel (role checked on the server in every page and action)
src/app/api/       auth, uploads, payment callbacks/returns, cron, visitor beacon
src/server/        server-only logic: orders, payments, cart, auth, email, storage, push
src/lib/           money (paisa), pricing, validation, permissions, order statuses
src/app/api/mobile/ JSON API for the Android admin app (Bearer tokens)
mobile/            Android admin app (Expo)
scripts/           mock payment gateways for local testing
tests/             unit tests (Vitest)
```

## 5. Security notes

- Every admin page and server action calls `requireStaff()` / `requireOwner()`, which re-reads the user from the database (a disabled user or role change takes effect immediately).
- Login, registration, password reset, order lookup, coupon, checkout and proof upload are rate-limited (Postgres-backed, so it works on serverless).
- Uploads are checked by magic bytes (JPG/PNG/WebP, 5 MB). Payment screenshots are private and only served to staff.
- Stock is reserved with a conditional update inside the order transaction. Database `CHECK` constraints stop negative stock or totals.
