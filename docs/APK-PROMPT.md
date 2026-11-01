# Building the Android APK

The app is in `mobile/` (Expo SDK 58). The APK is built in the cloud by **EAS Build**, so no Android Studio is needed. You need:

- a computer with **Node.js 20+** and **Git**
- a free **Expo account** (https://expo.dev/signup)
- optional, for push notifications: a free **Firebase** project

## Quick steps (manual)

```bash
git clone https://github.com/rafey581/store.git
```

```bash
cd store/mobile && npm ci
```

1. Edit `mobile/app.json` and set `expo.extra.apiUrl` to your live site, e.g. `"https://yourstore.pk"`. Optionally change `expo.name` (the app name on the phone) and `expo.android.package` (e.g. `pk.yourstore.admin`; it can't be changed after publishing to Play Store).
2. Log in and link the project. `eas init` writes `extra.eas.projectId` into app.json.
   ```bash
   npx eas-cli@latest login
   ```
   ```bash
   npx eas-cli@latest init
   ```
3. Build the APK. Accept "Generate a new Android Keystore" when asked.
   ```bash
   npx eas-cli@latest build -p android --profile preview
   ```
4. When the build finishes (about 10–20 minutes), EAS prints a link and a QR code. Open it on the phone, download the `.apk` and install it (allow "Install unknown apps").
5. Open the app, enter the store URL and sign in with an Owner or Staff account.

Push notifications need Firebase (FCM). Follow "Push notifications (FCM)" in `docs/MOBILE.md`, then build again.

---

## Copy-paste prompt for an AI coding assistant

Use this with Claude Code (or a similar agent) running **on your own computer** inside the cloned repository. It will do the steps above, pause where you need to log in, and report the APK link.

```text
You are helping me build the Android APK for the Expo app in the `mobile/` folder of this repository (Expo SDK 58, Expo Router, TypeScript). Follow these steps exactly and stop to ask me whenever a step needs my input or a login.

Facts:
- Live store URL (API): https://yourstore.pk        <-- I will replace this before sending
- App name on the phone: Store Admin                 <-- optional change
- Android package name: pk.store.admin               <-- optional change; ask me before changing it
- The app talks to the website's /api/mobile/* endpoints. Do not change any website code.

Steps:
1. Check that Node.js 20+ and git are installed (`node -v`, `git --version`). If not, tell me how to install them and stop.
2. `cd mobile` and run `npm ci`. If it fails, show me the error; do not upgrade packages or change Expo versions.
3. In `mobile/app.json`, set `expo.extra.apiUrl` to the live store URL above. Set `expo.name` and `expo.android.package` to the values above. Keep everything else unchanged. Show me the diff.
4. Run `npx tsc --noEmit` in `mobile/` and make sure it passes.
5. Run `npx eas-cli@latest whoami`. If I am not logged in, run `npx eas-cli@latest login` and let me type my Expo username and password myself. Never ask me to paste passwords into the chat.
6. Run `npx eas-cli@latest init` to link the project (it writes extra.eas.projectId into app.json). Accept the defaults.
7. Ask me whether I want push notifications now.
   - If yes: guide me through creating a Firebase project with an Android app using the same package name, placing `google-services.json` in `mobile/`, adding `"googleServicesFile": "./google-services.json"` under `expo.android` in app.json, and uploading the FCM V1 service account key with `npx eas-cli@latest credentials` (Android → Google Service Account → FCM V1). Do not commit google-services.json or the service account key to git.
   - If no: continue; notifications can be added later with a rebuild.
8. Start the build: `npx eas-cli@latest build -p android --profile preview`. When asked to generate a new Android keystore, choose yes (EAS stores it safely).
9. Wait for the build to finish and give me the APK download URL from the output (or from https://expo.dev under the project's builds).
10. Tell me how to install it: open the link on the Android phone, download, allow "Install unknown apps", install, then sign in with my store's Owner or Staff account using the live store URL.
11. Finally, list the files you changed and commit only `mobile/app.json` with the message "Configure Android app for production". Do not push unless I say so.

If any step fails, stop and show me the exact error output instead of guessing.
```

## For the Google Play Store (later)

```bash
npx eas-cli@latest build -p android --profile production
```

That produces an `.aab` file. Upload it in Google Play Console (one-time USD 25 developer fee), or automate the upload with `npx eas-cli@latest submit -p android`.
