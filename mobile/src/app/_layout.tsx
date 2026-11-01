import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { AuthProvider } from "@/lib/auth";
import { C } from "@/components/ui";

function useNotificationTaps() {
  useEffect(() => {
    const open = (data: Record<string, unknown> | undefined) => {
      if (data?.type === "proof") router.push("/(tabs)/proofs");
      else if (typeof data?.orderId === "string") router.push(`/order/${data.orderId}`);
    };
    // App opened from a notification while it was closed.
    Notifications.getLastNotificationResponseAsync()
      .then((r) => r && open(r.notification.request.content.data as Record<string, unknown>))
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data as Record<string, unknown>));
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  useNotificationTaps();
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: C.brandDark, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="order/[id]" options={{ title: "Order" }} />
        <Stack.Screen name="product/[id]" options={{ title: "Quick edit" }} />
      </Stack>
    </AuthProvider>
  );
}
