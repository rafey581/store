import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useApi } from "@/lib/useApi";
import { RequireAuth } from "@/components/require-auth";
import { api, absUrl } from "@/lib/api";
import { formatPKR, paisaToInput, rupeesToPaisa } from "@/lib/format";
import { Button, Card, Chip, Notice, s, C } from "@/components/ui";

type Variant = { id: string; title: string; sku: string; pricePaisa: number; compareAtPricePaisa: number | null; stock: number; isActive: boolean };
type Product = { id: string; name: string; status: string; totalStock: number; imageUrl: string | null; variants: Variant[] };

function VariantEditor({ v, onSaved }: { v: Variant; onSaved: (msg: string, tone: "ok" | "error", reload?: boolean) => void }) {
  const [price, setPrice] = useState(paisaToInput(v.pricePaisa));
  const [stock, setStock] = useState(String(v.stock));
  const [active, setActive] = useState(v.isActive);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setPrice(paisaToInput(v.pricePaisa));
    setStock(String(v.stock));
    setActive(v.isActive);
  }, [v]);
  const dirty = price !== paisaToInput(v.pricePaisa) || stock !== String(v.stock) || active !== v.isActive;

  const save = async () => {
    const pricePaisa = rupeesToPaisa(price);
    const stockN = Number(stock);
    if (pricePaisa === null) return onSaved("Enter a valid price, e.g. 2499 or 2499.50", "error");
    if (!Number.isInteger(stockN) || stockN < 0) return onSaved("Stock must be a whole number.", "error");
    setBusy(true);
    try {
      await api(`/api/mobile/variants/${v.id}`, { method: "PATCH", body: { pricePaisa, isActive: active, ...(stockN !== v.stock ? { stock: stockN, expectedStock: v.stock } : {}) } });
      onSaved(`${v.title === "Default" ? "Product" : v.title} saved.`, "ok", true);
    } catch (e) {
      onSaved(e instanceof Error ? e.message : "Save failed", "error", true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "700" }}>{v.title}</Text>
          <Text style={s.muted}>SKU {v.sku} · now {formatPKR(v.pricePaisa)}</Text>
        </View>
        <Switch value={active} onValueChange={setActive} trackColor={{ true: C.brand }} accessibilityLabel="Variant active" />
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.muted}>Price (Rs)</Text>
          <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={s.input} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.muted}>Stock</Text>
          <TextInput value={stock} onChangeText={setStock} keyboardType="number-pad" style={s.input} />
        </View>
      </View>
      {dirty && <Button title="Save" onPress={save} loading={busy} style={{ marginTop: 10 }} />}
    </Card>
  );
}

export default function ProductEditScreen() {
  return (
    <RequireAuth>
      <ProductEdit />
    </RequireAuth>
  );
}

function ProductEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: p, error, loading, reload } = useApi<Product>(`/api/mobile/products/${id}`);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const setStatus = async (status: string) => {
    try {
      await api(`/api/mobile/products/${id}`, { method: "PATCH", body: { status } });
      setMsg({ text: `Status set to ${status.toLowerCase()}.`, tone: "ok" });
      reload();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Failed", tone: "error" });
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 12 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: p?.name ?? "Quick edit" }} />
      {error && <Notice text={error} tone="error" />}
      {msg && <Notice text={msg.text} tone={msg.tone} />}
      {p && (
        <>
          <Card style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Image source={absUrl(p.imageUrl) ? { uri: absUrl(p.imageUrl)! } : undefined} style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: C.bg }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>{p.name}</Text>
              <Text style={s.muted}>Total stock {p.totalStock}</Text>
            </View>
          </Card>
          <Card>
            <Text style={s.h2}>Visibility</Text>
            <View style={{ flexDirection: "row" }}>
              {[["ACTIVE", "Active"], ["DRAFT", "Draft"], ["ARCHIVED", "Archived"]].map(([v, l]) => <Chip key={v} label={l} active={p.status === v} onPress={() => p.status !== v && setStatus(v)} />)}
            </View>
          </Card>
          {p.variants.map((v) => <VariantEditor key={v.id} v={v} onSaved={(text, tone, again) => { setMsg({ text, tone }); if (again) reload(); }} />)}
          <Text style={[s.muted, { textAlign: "center" }]}>Images, options and descriptions are edited in the web admin.</Text>
        </>
      )}
    </ScrollView>
  );
}
