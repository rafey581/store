import { useState } from "react";
import { Linking, RefreshControl, ScrollView, Switch, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useApi } from "@/lib/useApi";
import { RequireAuth } from "@/components/require-auth";
import { api } from "@/lib/api";
import { STATUS_LABEL, METHOD_LABEL, formatDate, formatPKR } from "@/lib/format";
import { Button, Card, Chip, Field, Notice, Row, StatusBadge, confirmAction, s, C } from "@/components/ui";

type Order = {
  id: string; number: number; status: string; paymentStatus: string; paymentMethod: string; createdAt: string;
  email: string; customerName: string; phone: string; shipLine1: string; shipLine2: string | null; shipCity: string; shipProvince: string | null; customerNote: string | null;
  subtotalPaisa: number; discountPaisa: number; shippingPaisa: number; totalPaisa: number; couponCode: string | null;
  courierName: string | null; trackingNumber: string | null; expiresAt: string | null;
  items: { id: string; productName: string; variantTitle: string; sku: string; quantity: number; lineTotalPaisa: number }[];
  statusEvents: { id: string; fromStatus: string | null; toStatus: string; note: string | null; actorType: string; createdAt: string }[];
  proofs: { id: string; status: string; transactionId: string; amountClaimedPaisa: number }[];
  payments: { id: string; method: string; status: string; amountPaisa: number; reference: string; failureReason: string | null }[];
  allowedTransitions: string[];
};

export default function OrderDetailScreen() {
  return (
    <RequireAuth>
      <OrderDetail />
    </RequireAuth>
  );
}

function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: o, error, loading, reload } = useApi<Order>(`/api/mobile/orders/${id}`);
  const [to, setTo] = useState<string | null>(null);
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const submit = () => {
    if (!o || !to) return;
    confirmAction(`Mark as ${STATUS_LABEL[to]}?`, notify ? "The customer will be emailed." : "The customer will not be emailed.", async () => {
      setBusy(true);
      try {
        const r = await api<{ ok: string }>(`/api/mobile/orders/${o.id}/status`, { method: "POST", body: { to, note: note || undefined, courierName: courier || undefined, trackingNumber: tracking || undefined, notify } });
        setMsg({ text: r.ok, tone: "ok" });
        setTo(null);
        setNote("");
        await reload();
      } catch (e) {
        setMsg({ text: e instanceof Error ? e.message : "Failed", tone: "error" });
      } finally {
        setBusy(false);
      }
    }, "Confirm", to === "CANCELLED" || to === "REFUNDED");
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 12 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: o ? `Order #${o.number}` : "Order" }} />
      {error && <Notice text={error} tone="error" />}
      {msg && <Notice text={msg.text} tone={msg.tone} />}
      {o && (
        <>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={s.h1}>{formatPKR(o.totalPaisa)}</Text>
              <StatusBadge status={o.status} />
            </View>
            <Text style={s.muted}>{formatDate(o.createdAt)} · {METHOD_LABEL[o.paymentMethod]}</Text>
            {o.status === "PAYMENT_REVIEW" && <View style={{ marginTop: 8 }}><Button title="Review payment proof" onPress={() => router.push("/(tabs)/proofs")} /></View>}
          </Card>

          <Card>
            <Text style={s.h2}>Customer</Text>
            <Text style={{ fontWeight: "600" }}>{o.customerName}</Text>
            <Text>{o.shipLine1}{o.shipLine2 ? `, ${o.shipLine2}` : ""}</Text>
            <Text>{o.shipCity}{o.shipProvince ? `, ${o.shipProvince}` : ""}</Text>
            <Text style={s.muted}>{o.email}</Text>
            {o.customerNote && <Notice text={`Note: ${o.customerNote}`} />}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <Button title="Call" variant="secondary" onPress={() => Linking.openURL(`tel:${o.phone}`)} style={{ flex: 1 }} />
              <Button title="WhatsApp" variant="secondary" onPress={() => Linking.openURL(`https://wa.me/92${o.phone.replace(/^0/, "")}`)} style={{ flex: 1 }} />
            </View>
          </Card>

          <Card>
            <Text style={s.h2}>Items</Text>
            {o.items.map((it) => (
              <View key={it.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                <Text style={{ flex: 1 }}>{it.productName}{it.variantTitle !== "Default" ? ` (${it.variantTitle})` : ""} × {it.quantity}</Text>
                <Text>{formatPKR(it.lineTotalPaisa)}</Text>
              </View>
            ))}
            <View style={{ borderTopWidth: 1, borderColor: C.border, marginTop: 6, paddingTop: 6 }}>
              <Row label="Subtotal" value={formatPKR(o.subtotalPaisa)} />
              {o.discountPaisa > 0 && <Row label={`Discount${o.couponCode ? ` (${o.couponCode})` : ""}`} value={`-${formatPKR(o.discountPaisa)}`} />}
              <Row label="Shipping" value={o.shippingPaisa ? formatPKR(o.shippingPaisa) : "Free"} />
              <Row label="Total" value={formatPKR(o.totalPaisa)} />
            </View>
          </Card>

          {(o.trackingNumber || o.courierName) && (
            <Card>
              <Text style={s.h2}>Shipment</Text>
              <Row label="Courier" value={o.courierName ?? "—"} />
              <Row label="Tracking" value={o.trackingNumber ?? "—"} />
            </Card>
          )}

          <Card>
            <Text style={s.h2}>Update status</Text>
            {o.allowedTransitions.length === 0 ? (
              <Text style={s.muted}>{o.status === "PENDING_PAYMENT" || o.status === "PAYMENT_REVIEW" ? "Waiting for payment." : "No further changes available."}</Text>
            ) : (
              <>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {o.allowedTransitions.map((t) => <Chip key={t} label={STATUS_LABEL[t]} active={to === t} onPress={() => setTo(t)} />)}
                </View>
                {to === "SHIPPED" && (
                  <>
                    <Field label="Courier" value={courier} onChangeText={setCourier} placeholder={o.courierName ?? "TCS, Leopards, M&P…"} />
                    <Field label="Tracking number" value={tracking} onChangeText={setTracking} placeholder={o.trackingNumber ?? ""} autoCapitalize="characters" />
                  </>
                )}
                {to && (
                  <>
                    <Field label="Note for the customer (optional)" value={note} onChangeText={setNote} />
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <Text>Email the customer</Text>
                      <Switch value={notify} onValueChange={setNotify} trackColor={{ true: C.brand }} />
                    </View>
                    <Button title={`Mark as ${STATUS_LABEL[to]}`} onPress={submit} loading={busy} variant={to === "CANCELLED" || to === "REFUNDED" ? "danger" : "primary"} />
                  </>
                )}
              </>
            )}
          </Card>

          {o.payments.length > 0 && (
            <Card>
              <Text style={s.h2}>Payments</Text>
              {o.payments.map((p) => (
                <View key={p.id} style={{ paddingVertical: 4 }}>
                  <Text>{METHOD_LABEL[p.method]} · {p.status} · {formatPKR(p.amountPaisa)}</Text>
                  {p.failureReason && <Text style={{ color: C.danger, fontSize: 12 }}>{p.failureReason}</Text>}
                </View>
              ))}
            </Card>
          )}

          <Card>
            <Text style={s.h2}>History</Text>
            {o.statusEvents.map((e) => (
              <View key={e.id} style={{ paddingVertical: 4, borderLeftWidth: 2, borderColor: C.border, paddingLeft: 10 }}>
                <Text style={{ fontWeight: "600" }}>{STATUS_LABEL[e.toStatus]}</Text>
                <Text style={s.muted}>{formatDate(e.createdAt)} · {e.actorType.toLowerCase()}{e.note ? ` · ${e.note}` : ""}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}
