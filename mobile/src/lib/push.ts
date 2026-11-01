import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api, getStoredPushToken, setStoredPushToken } from "./api";

// Show notifications as banners while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export type PushResult = { ok: true; token: string } | { ok: false; reason: string };

/** Asks for permission, creates Android channels, gets the Expo push token and registers it with the store. */
export async function registerForPush(): Promise<PushResult> {
  if (!Device.isDevice) return { ok: false, reason: "Push notifications need a real phone (not an emulator)." };
  if (Platform.OS === "android") {
    // Channel ids match those sent by the server (src/server/push.ts).
    await Notifications.setNotificationChannelAsync("orders", { name: "New orders", importance: Notifications.AndroidImportance.MAX, sound: "default", vibrationPattern: [0, 250, 250, 250] });
    await Notifications.setNotificationChannelAsync("proofs", { name: "Payment proofs", importance: Notifications.AndroidImportance.HIGH, sound: "default" });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return { ok: false, reason: "Notifications are turned off for this app. Enable them in Android settings." };
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) return { ok: false, reason: "Missing EAS projectId in app.json (run `eas init`)." };
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api("/api/mobile/push-devices", { method: "POST", body: { expoPushToken: token, platform: Platform.OS === "ios" ? "IOS" : "ANDROID" } });
    await setStoredPushToken(token);
    return { ok: true, token };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Could not register for notifications." };
  }
}

export async function unregisterPush() {
  const token = await getStoredPushToken();
  await setStoredPushToken(null);
  return token;
}
