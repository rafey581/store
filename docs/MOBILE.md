# Android admin app (Expo)

Source: `mobile/` (React Native + Expo SDK 58 + TypeScript + Expo Router). It uses the same backend as the website through `/api/mobile/*`.

## Screens

| Screen | What it does |
|---|---|
| Login | Store URL + staff/owner email and password. Customer accounts are refused. |
| Dashboard | Sales today / 7 / 30 days, orders today, pending proofs, to ship, awaiting payment, low stock, live / today / total visitors, 14-day chart, recent orders |
| Orders | Filter (to ship, under review, awaiting payment, shipped…), search by order #, name or phone, infinite scroll |
| Order detail | Items, totals, customer (call / WhatsApp), status history, payments. Status update with courier + tracking number and optional customer email. Owner-only actions (cancel paid / refund) are hidden from Staff and refused by the server. |
| Payment proofs | Screenshot (full-screen view), transaction ID, amount mismatch and duplicate transaction warnings. Approve or reject with a reason. |
| Products | Search, low-stock filter |
| Quick edit | Price, stock and active switch per variant; product visibility (active / draft / archived). Stock edits are refused if an order changed the stock meanwhile. |
| Account | Profile, enable notifications, open web admin, sign out |

Push notifications: **New order** (`orders` channel) and **Payment proof uploaded** (`proofs` channel). Tapping a notification opens the order or the proofs list.

## Security

- Short-lived access token (15 min) plus a refresh token that rotates on every use. Tokens are stored in Android Keystore-backed SecureStore.
- Reusing an old refresh token signs out every session of that user (theft detection).
- Every API call re-checks the user in the database, so a disabled user or a role change takes effect immediately.
- Signing out revokes the refresh token on the server and removes the phone's push token.

## Run during development

Push notifications do not work in Expo Go on Android, so use a development build for the full app. Without notifications, Expo Go is enough for trying the screens.

```bash
cd mobile
```

```bash
npm install
```

```bash
npx expo start
```

On the login screen, enter your store URL. A phone cannot reach `localhost`, so use your computer's LAN IP, e.g. `http://192.168.1.20:3000`, or a deployed URL.

## Build the APK with EAS

You need a free Expo account.

1. Set the default store URL shown on the login screen in `mobile/app.json` → `expo.extra.apiUrl` (e.g. `https://yourstore.pk`). Optionally change `expo.name` and `expo.android.package`. Replace the icons in `mobile/assets/` with the store's logo.
2. Log in and link the project. `eas init` writes `extra.eas.projectId` into `app.json`, which push notifications need.
   ```bash
   npx eas-cli@latest login
   ```
   ```bash
   npx eas-cli@latest init
   ```
3. **Push notifications (FCM):** Android push goes through Firebase Cloud Messaging.
   1. Create a Firebase project, add an Android app with the same package name (`pk.store.admin` by default), and download `google-services.json` into `mobile/`.
   2. Add `"googleServicesFile": "./google-services.json"` under `expo.android` in `app.json`.
   3. In Firebase → Project settings → Service accounts, generate a private key (JSON).
   4. Upload that key to EAS. Choose Android → Google Service Account → FCM V1:
      ```bash
      npx eas-cli@latest credentials
      ```
4. Build an installable APK. The command prints a download link (also in the Expo dashboard); install the APK on the phone.
   ```bash
   npx eas-cli@latest build -p android --profile preview
   ```
   For the Play Store, use `--profile production` (AAB).
5. Optional: if you turn on "enhanced push security" in Expo, set `EXPO_ACCESS_TOKEN` in the website's environment variables.

## What was and was not tested

Tested in the build environment:
- `tsc --noEmit` passes against the installed SDK 58 type definitions.
- `expo export --platform android` bundles the app (1,240 modules, Hermes bytecode).
- 35 automated checks against `/api/mobile/*`: auth, roles, refresh rotation and reuse detection, disabled users, orders, proofs, status changes, quick edit conflicts, push device registration.
- The same app code built for the web and driven in a headless browser against a local store: login (including the wrong-password message), dashboard, proof approval, order shipping with tracking number, stock quick edit and sign-out all worked end to end.

Not tested (needs a real Android phone and an Expo account):
- The APK build itself (`eas build`) and running on a physical device.
- Push notifications (need FCM credentials and a real device).
- Payment screenshots load with the auth header via `expo-image` headers. That support is native-only; the web test build cannot send them.
- The docs at docs.expo.dev were not reachable while building. APIs were checked against the installed package type definitions instead.
