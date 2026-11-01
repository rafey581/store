import { useCallback, useEffect, useState } from "react";
import { Text, type ColorValue } from "react-native";
import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { C } from "@/components/ui";

const icon = (glyph: string) => ({ color }: { color: ColorValue }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;

export default function TabsLayout() {
  const { status } = useAuth();
  const [pending, setPending] = useState<number | undefined>();
  const loadBadge = useCallback(() => {
    api<{ items: unknown[] }>("/api/mobile/proofs").then((r) => setPending(r.items.length || undefined)).catch(() => {});
  }, []);
  useEffect(() => {
    if (status !== "signedIn") return;
    loadBadge();
    const t = setInterval(loadBadge, 60_000);
    return () => clearInterval(t);
  }, [status, loadBadge]);

  if (status === "signedOut") return <Redirect href="/login" />;
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: C.brand, headerTintColor: C.text }}>
      <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: icon("▦") }} />
      <Tabs.Screen name="orders" options={{ title: "Orders", tabBarIcon: icon("☰") }} />
      <Tabs.Screen name="proofs" options={{ title: "Proofs", tabBarIcon: icon("✓"), tabBarBadge: pending }} listeners={{ focus: loadBadge }} />
      <Tabs.Screen name="products" options={{ title: "Products", tabBarIcon: icon("◫") }} />
      <Tabs.Screen name="settings" options={{ title: "Account", tabBarIcon: icon("⚙") }} />
    </Tabs>
  );
}
