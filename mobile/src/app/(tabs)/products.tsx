import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useApi } from "@/lib/useApi";
import { absUrl } from "@/lib/api";
import { formatPKR } from "@/lib/format";
import { Chip, Empty, Notice, s, C } from "@/components/ui";

type P = { id: string; name: string; status: string; minPricePaisa: number; maxPricePaisa: number; totalStock: number; imageUrl: string | null };

export default function Products() {
  const params = useLocalSearchParams<{ lowStock?: string }>();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [low, setLow] = useState(params.lowStock === "1");
  useEffect(() => {
    if (params.lowStock !== undefined) setLow(params.lowStock === "1");
  }, [params.lowStock]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);
  const { data, error, loading, reload } = useApi<{ items: P[] }>(`/api/mobile/products?q=${encodeURIComponent(debounced)}${low ? "&lowStock=1" : ""}`);

  return (
    <View style={s.screen}>
      <View style={{ padding: 12, paddingBottom: 0 }}>
        <TextInput value={q} onChangeText={setQ} placeholder="Search name or SKU" style={s.input} placeholderTextColor="#9ca3af" autoCorrect={false} />
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          <Chip label="All" active={!low} onPress={() => setLow(false)} />
          <Chip label="Low stock (≤5)" active={low} onPress={() => setLow(true)} />
        </View>
      </View>
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListHeaderComponent={error ? <Notice text={error} tone="error" /> : undefined}
        ListEmptyComponent={!loading ? <Empty text="No products." /> : undefined}
        renderItem={({ item: p }) => (
          <Pressable onPress={() => router.push(`/product/${p.id}`)} style={[s.card, { flexDirection: "row", gap: 12, alignItems: "center" }]}>
            <Image source={absUrl(p.imageUrl) ? { uri: absUrl(p.imageUrl)! } : undefined} style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: C.bg }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600" }} numberOfLines={2}>{p.name}</Text>
              <Text style={s.muted}>{p.minPricePaisa === p.maxPricePaisa ? formatPKR(p.minPricePaisa) : `${formatPKR(p.minPricePaisa)} – ${formatPKR(p.maxPricePaisa)}`} · {p.status.toLowerCase()}</Text>
            </View>
            <Text style={{ fontWeight: "800", color: p.totalStock <= 5 ? C.danger : C.text }}>{p.totalStock}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
