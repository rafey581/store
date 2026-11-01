import { useState } from "react";
import { FlatList, Modal, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useApi } from "@/lib/useApi";
import { api, absUrl, authHeaders } from "@/lib/api";
import { formatDate, formatPKR } from "@/lib/format";
import { Button, Chip, Empty, Notice, confirmAction, s, C } from "@/components/ui";

type Proof = {
  id: string; status: string; transactionId: string; payerName: string | null; amountClaimedPaisa: number; account: string | null; rejectionReason: string | null; createdAt: string; screenshotUrl: string;
  order: { id: string; number: number; totalPaisa: number; customerName: string }; amountMismatch: boolean; duplicateTxnId: boolean;
};

export default function Proofs() {
  const [status, setStatus] = useState("PENDING");
  const { data, error, loading, reload } = useApi<{ items: Proof[] }>(`/api/mobile/proofs?status=${status}`);
  const [viewing, setViewing] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Proof | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const review = async (p: Proof, decision: "approve" | "reject", why?: string) => {
    setBusy(p.id);
    try {
      const r = await api<{ ok: string }>(`/api/mobile/proofs/${p.id}/review`, { method: "POST", body: { decision, reason: why } });
      setMsg({ text: `#${p.order.number}: ${r.ok}`, tone: "ok" });
      setRejecting(null);
      setReason("");
      await reload();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Failed", tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const approve = (p: Proof) =>
    confirmAction("Approve payment?", `Confirm you received ${formatPKR(p.amountClaimedPaisa)} (txn ${p.transactionId}) in your bank or wallet account.`, () => review(p, "approve"), "Approve");

  return (
    <View style={s.screen}>
      <View style={{ flexDirection: "row", padding: 12, paddingBottom: 0 }}>
        {["PENDING", "APPROVED", "REJECTED"].map((st) => <Chip key={st} label={st.charAt(0) + st.slice(1).toLowerCase()} active={status === st} onPress={() => setStatus(st)} />)}
      </View>
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListHeaderComponent={<>{error && <Notice text={error} tone="error" />}{msg && <Notice text={msg.text} tone={msg.tone} />}</>}
        ListEmptyComponent={!loading ? <Empty text={`No ${status.toLowerCase()} proofs.`} /> : undefined}
        renderItem={({ item: p }) => (
          <View style={s.card}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable onPress={() => setViewing(absUrl(p.screenshotUrl))} accessibilityLabel="Open screenshot">
                <Image source={{ uri: absUrl(p.screenshotUrl) ?? undefined, headers: authHeaders() }} style={{ width: 96, height: 128, borderRadius: 8, backgroundColor: C.bg }} contentFit="cover" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Pressable onPress={() => router.push(`/order/${p.order.id}`)}><Text style={{ fontWeight: "800", color: C.brandDark, fontSize: 16 }}>Order #{p.order.number}</Text></Pressable>
                <Text style={s.muted}>{p.order.customerName}</Text>
                <Text style={{ marginTop: 4 }}>Txn: <Text style={{ fontWeight: "700" }}>{p.transactionId}</Text></Text>
                <Text>Claimed {formatPKR(p.amountClaimedPaisa)} · Total {formatPKR(p.order.totalPaisa)}</Text>
                {p.account && <Text style={s.muted}>To: {p.account}</Text>}
                <Text style={s.muted}>{formatDate(p.createdAt)}</Text>
              </View>
            </View>
            {p.amountMismatch && <View style={{ marginTop: 8 }}><Notice text="Amount does not match the order total." /></View>}
            {p.duplicateTxnId && <View style={{ marginTop: 4 }}><Notice text="This transaction ID was used on another order." tone="error" /></View>}
            {p.status === "PENDING" ? (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <Button title="Approve" onPress={() => approve(p)} loading={busy === p.id} style={{ flex: 1 }} />
                <Button title="Reject" variant="secondary" onPress={() => setRejecting(p)} disabled={busy === p.id} style={{ flex: 1 }} />
              </View>
            ) : (
              <Text style={{ marginTop: 8, fontWeight: "600", color: p.status === "APPROVED" ? C.brandDark : C.danger }}>{p.status === "APPROVED" ? "Approved" : `Rejected: ${p.rejectionReason}`}</Text>
            )}
          </View>
        )}
      />

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center" }} onPress={() => setViewing(null)}>
          {viewing && <Image source={{ uri: viewing, headers: authHeaders() }} style={{ width: "100%", height: "85%" }} contentFit="contain" />}
          <Text style={{ color: "#fff", textAlign: "center", marginTop: 8 }}>Tap to close</Text>
        </Pressable>
      </Modal>

      <Modal visible={!!rejecting} transparent animationType="slide" onRequestClose={() => setRejecting(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={s.h2}>Reject proof for #{rejecting?.order.number}</Text>
            <Text style={[s.muted, { marginBottom: 8 }]}>The customer sees this reason and can upload a new proof.</Text>
            <TextInput value={reason} onChangeText={setReason} placeholder="e.g. Amount not received in our account" style={[s.input, { minHeight: 70, textAlignVertical: "top" }]} multiline />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Button title="Cancel" variant="secondary" onPress={() => setRejecting(null)} style={{ flex: 1 }} />
              <Button title="Reject" variant="danger" disabled={reason.trim().length < 3} loading={busy === rejecting?.id} onPress={() => rejecting && review(rejecting, "reject", reason.trim())} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
