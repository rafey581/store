import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { formatDate, formatPKR, METHOD_LABEL } from "@/lib/format";
import { Chip, Empty, Notice, StatusBadge, s, C } from "@/components/ui";

type OrderRow = { id: string; number: number; customerName: string; shipCity: string; totalPaisa: number; status: string; paymentMethod: string; createdAt: string };
const FILTERS: [string, string][] = [["", "All"], ["TO_SHIP", "To ship"], ["PAYMENT_REVIEW", "Under review"], ["PENDING_PAYMENT", "Awaiting payment"], ["SHIPPED", "Shipped"], ["DELIVERED", "Delivered"], ["CANCELLED", "Cancelled"]];

export default function Orders() {
  const params = useLocalSearchParams<{ status?: string }>();
  const [status, setStatus] = useState(params.status ?? "");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<OrderRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.status !== undefined) setStatus(params.status);
  }, [params.status]);

  const load = useCallback(async (reset: boolean, after: string | null = null) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status, q, ...(after && !reset ? { cursor: after } : {}) });
      const r = await api<{ items: OrderRow[]; nextCursor: string | null }>(`/api/mobile/orders?${qs}`);
      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setCursor(r.nextCursor);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    const t = setTimeout(() => load(true), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <View style={s.screen}>
      <View style={{ padding: 12, paddingBottom: 4 }}>
        <TextInput value={q} onChangeText={setQ} placeholder="Search order #, name, phone" style={s.input} placeholderTextColor="#9ca3af" autoCorrect={false} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {FILTERS.map(([v, l]) => <Chip key={v} label={l} active={status === v} onPress={() => setStatus(v)} />)}
        </ScrollView>
      </View>
      {error && <View style={{ paddingHorizontal: 12 }}><Notice text={error} tone="error" /></View>}
      <FlatList
        data={items}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={loading && items.length === 0} onRefresh={() => load(true)} />}
        onEndReached={() => cursor && !loading && load(false, cursor)}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={!loading ? <Empty text="No orders found." /> : undefined}
        ListFooterComponent={loading && items.length > 0 ? <ActivityIndicator color={C.brand} /> : undefined}
        renderItem={({ item: o }) => (
          <Pressable onPress={() => router.push(`/order/${o.id}`)} style={s.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "800", color: C.brandDark, fontSize: 16 }}>#{o.number}</Text>
              <StatusBadge status={o.status} />
            </View>
            <Text style={{ marginTop: 4, fontWeight: "600" }}>{o.customerName} · {o.shipCity}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
              <Text style={s.muted}>{formatDate(o.createdAt)} · {METHOD_LABEL[o.paymentMethod]}</Text>
              <Text style={{ fontWeight: "700" }}>{formatPKR(o.totalPaisa)}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
