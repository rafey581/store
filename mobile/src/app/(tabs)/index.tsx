import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useApi } from "@/lib/useApi";
import { formatPKR } from "@/lib/format";
import { Card, Notice, StatusBadge, s, C } from "@/components/ui";

type Stats = {
  sales: { todayPaisa: number; todayCount: number; last7Paisa: number; last7Count: number; last30Paisa: number; last30Count: number };
  ordersToday: number;
  pendingPayment: number;
  pendingProofs: number;
  toShip: number;
  lowStock: { id: string; productId: string; productName: string; title: string; stock: number }[];
  visitors: { total: number; live: number; today: number; pageViewsToday: number };
  recentOrders: { id: string; number: number; customerName: string; totalPaisa: number; status: string }[];
  chart: { date: string; revenuePaisa: number }[];
};

function Stat({ label, value, sub, alert, onPress }: { label: string; value: string | number; sub?: string; alert?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ width: "50%", padding: 4 }}>
      <View style={[s.card, { marginBottom: 0 }, alert ? { backgroundColor: C.warnBg, borderColor: "#fcd34d" } : null]}>
        <Text style={{ fontSize: 11, color: C.muted, fontWeight: "600", textTransform: "uppercase" }}>{label}</Text>
        <Text style={{ fontSize: 20, fontWeight: "800", color: C.text, marginTop: 2 }}>{value}</Text>
        {sub ? <Text style={s.muted}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

export default function Dashboard() {
  const { data, error, loading, reload } = useApi<Stats>("/api/mobile/dashboard");
  const max = Math.max(1, ...(data?.chart.map((c) => c.revenuePaisa) ?? [1]));
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 12 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      {error && <Notice text={error} tone="error" />}
      {data && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginBottom: 8 }}>
            <Stat label="Sales today" value={formatPKR(data.sales.todayPaisa)} sub={`${data.sales.todayCount} paid`} />
            <Stat label="Last 7 days" value={formatPKR(data.sales.last7Paisa)} sub={`${data.sales.last7Count} paid`} />
            <Stat label="Last 30 days" value={formatPKR(data.sales.last30Paisa)} sub={`${data.sales.last30Count} paid`} />
            <Stat label="Orders today" value={data.ordersToday} onPress={() => router.push("/(tabs)/orders")} />
            <Stat label="Pending proofs" value={data.pendingProofs} alert={data.pendingProofs > 0} onPress={() => router.push("/(tabs)/proofs")} />
            <Stat label="To ship" value={data.toShip} alert={data.toShip > 0} onPress={() => router.push({ pathname: "/(tabs)/orders", params: { status: "TO_SHIP" } })} />
            <Stat label="Awaiting payment" value={data.pendingPayment} />
            <Stat label="Low stock" value={data.lowStock.length} alert={data.lowStock.length > 0} onPress={() => router.push({ pathname: "/(tabs)/products", params: { lowStock: "1" } })} />
            <Stat label="Live visitors" value={data.visitors.live} sub="last 5 min" />
            <Stat label="Visitors today" value={data.visitors.today} sub={`${data.visitors.pageViewsToday} views`} />
            <Stat label="Total visitors" value={data.visitors.total} />
          </View>
          <Card>
            <Text style={s.h2}>Paid sales, last 14 days</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", height: 90, gap: 3 }}>
              {data.chart.map((c) => (
                <View key={c.date} style={{ flex: 1, height: `${Math.max(3, (c.revenuePaisa / max) * 100)}%`, backgroundColor: C.brand, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
              ))}
            </View>
          </Card>
          <Card>
            <Text style={s.h2}>Recent orders</Text>
            {data.recentOrders.length === 0 && <Text style={s.muted}>No orders yet.</Text>}
            {data.recentOrders.map((o) => (
              <Pressable key={o.id} onPress={() => router.push(`/order/${o.id}`)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderTopWidth: 1, borderColor: C.border, gap: 8 }}>
                <Text style={{ fontWeight: "700", color: C.brandDark }}>#{o.number}</Text>
                <Text style={{ flex: 1 }} numberOfLines={1}>{o.customerName}</Text>
                <StatusBadge status={o.status} />
              </Pressable>
            ))}
          </Card>
          {data.lowStock.length > 0 && (
            <Card>
              <Text style={s.h2}>Low stock</Text>
              {data.lowStock.map((v) => (
                <Pressable key={v.id} onPress={() => router.push(`/product/${v.productId}`)} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
                  <Text style={{ flex: 1 }} numberOfLines={1}>{v.productName}{v.title !== "Default" ? ` (${v.title})` : ""}</Text>
                  <Text style={{ fontWeight: "700", color: v.stock === 0 ? C.danger : C.warnFg }}>{v.stock}</Text>
                </Pressable>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}
