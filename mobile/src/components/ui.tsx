import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/format";

export const C = {
  brand: "#059669",
  brandDark: "#047857",
  brandLight: "#ecfdf5",
  bg: "#f3f4f6",
  card: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  danger: "#dc2626",
  warnBg: "#fef3c7",
  warnFg: "#92400e",
};

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = "primary", disabled, loading, style }: { title: string; onPress: () => void; variant?: "primary" | "secondary" | "danger"; disabled?: boolean; loading?: boolean; style?: ViewStyle }) {
  const bg = variant === "primary" ? C.brand : variant === "danger" ? C.danger : C.card;
  const fg = variant === "secondary" ? C.text : "#fff";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, borderWidth: variant === "secondary" ? 1 : 0 }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#9ca3af" style={s.input} {...props} />
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? { bg: "#e5e7eb", fg: "#374151" };
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={{ color: c.fg, fontSize: 12, fontWeight: "600" }}>{STATUS_LABEL[status] ?? status}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: C.brand, borderColor: C.brand }]} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={{ color: active ? "#fff" : C.text, fontSize: 13, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ text, tone = "warn" }: { text: string; tone?: "warn" | "error" | "ok" }) {
  const map = { warn: [C.warnBg, C.warnFg], error: ["#fee2e2", "#991b1b"], ok: ["#d1fae5", "#065f46"] } as const;
  return (
    <View style={{ backgroundColor: map[tone][0], padding: 10, borderRadius: 8, marginBottom: 10 }}>
      <Text style={{ color: map[tone][1], fontSize: 13 }}>{text}</Text>
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={{ textAlign: "center", color: C.muted, padding: 32 }}>{text}</Text>;
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ color: C.muted }}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? <Text style={{ color: C.text, fontWeight: "500" }}>{value}</Text> : value}
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  btn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", borderColor: C.border },
  btnText: { fontWeight: "700", fontSize: 15 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: "#fff", color: C.text },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  chip: { borderWidth: 1, borderColor: C.border, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  h1: { fontSize: 20, fontWeight: "700", color: C.text },
  h2: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 8 },
  muted: { color: C.muted, fontSize: 13 },
});

/** Confirmation dialog: native Alert on Android/iOS, window.confirm on web (used for browser testing). */
export function confirmAction(title: string, message: string, onConfirm: () => void, confirmText = "Confirm", destructive = false) {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmText, style: destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
}
