import { useState } from "react";
import { Linking, ScrollView, Text } from "react-native";
import Constants from "expo-constants";
import { useAuth } from "@/lib/auth";
import { getBaseUrl } from "@/lib/api";
import { registerForPush } from "@/lib/push";
import { Button, Card, Notice, Row, confirmAction, s } from "@/components/ui";

export default function Settings() {
  const { user, signOut } = useAuth();
  const [push, setPush] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);

  const enablePush = async () => {
    setBusy(true);
    const r = await registerForPush();
    setPush(r.ok ? { text: "Notifications are on for new orders and payment proofs.", tone: "ok" } : { text: r.reason, tone: "error" });
    setBusy(false);
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 12 }}>
      <Card>
        <Text style={s.h2}>Account</Text>
        <Row label="Name" value={user?.name || "—"} />
        <Row label="Email" value={user?.email ?? ""} />
        <Row label="Role" value={user?.role === "OWNER" ? "Owner" : "Staff"} />
        <Row label="Store" value={getBaseUrl()} />
      </Card>
      <Card>
        <Text style={s.h2}>Notifications</Text>
        {push && <Notice text={push.text} tone={push.tone} />}
        <Text style={[s.muted, { marginBottom: 10 }]}>Get a notification when a new order is placed or a customer uploads a payment proof.</Text>
        <Button title="Enable / refresh notifications" onPress={enablePush} loading={busy} variant="secondary" />
      </Card>
      <Card>
        <Text style={s.h2}>Full admin panel</Text>
        <Text style={[s.muted, { marginBottom: 10 }]}>Product creation, images, coupons, shipping rates, settings and staff are managed in the web admin.</Text>
        <Button title="Open web admin" variant="secondary" onPress={() => Linking.openURL(`${getBaseUrl()}/admin`)} />
      </Card>
      <Button title="Sign out" variant="danger" onPress={() => confirmAction("Sign out?", "You will stop receiving notifications on this phone.", () => signOut(), "Sign out", true)} />
      <Text style={[s.muted, { textAlign: "center", marginTop: 16 }]}>Version {Constants.expoConfig?.version}</Text>
    </ScrollView>
  );
}
