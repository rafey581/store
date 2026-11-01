import { db } from "@/server/db";

// Expo Push Service: https://docs.expo.dev/push-notifications/sending-notifications/
export async function pushToStaff(kind: "order" | "proof", title: string, body: string, data: Record<string, string>) {
  try {
    const devices = await db.pushDevice.findMany({
      where: { ...(kind === "order" ? { notifyOrders: true } : { notifyProofs: true }), user: { role: { in: ["OWNER", "STAFF"] }, disabledAt: null } },
      select: { expoPushToken: true },
    });
    if (!devices.length) return;
    const messages = devices.map((d) => ({ to: d.expoPushToken, title, body, data, sound: "default", channelId: kind === "order" ? "orders" : "proofs", priority: "high" }));
    for (let i = 0; i < messages.length; i += 100) {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
        body: JSON.stringify(messages.slice(i, i + 100)),
      });
      const json = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
      // Remove tokens Expo reports as no longer registered.
      json?.data?.forEach((r, idx) => {
        if (r.status === "error" && r.details?.error === "DeviceNotRegistered") {
          db.pushDevice.delete({ where: { expoPushToken: messages[i + idx].to } }).catch(() => {});
        }
      });
    }
  } catch (e) {
    console.error("push failed", e);
  }
}
