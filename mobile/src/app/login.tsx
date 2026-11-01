import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { defaultBaseUrl, getBaseUrl } from "@/lib/api";
import { Button, Field, Notice, s, C } from "@/components/ui";

export default function Login() {
  const { signIn, status } = useAuth();
  const [baseUrl, setBaseUrl] = useState(getBaseUrl() || defaultBaseUrl());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "signedIn") router.replace("/(tabs)");
  }, [status]);

  const submit = async () => {
    setError(null);
    if (!baseUrl || !email || !password) return setError("Enter the store URL, email and password.");
    setBusy(true);
    try {
      await signIn(baseUrl, email.trim(), password);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: C.brandDark }}>Store Admin</Text>
            <Text style={s.muted}>Sign in with your staff or owner account.</Text>
          </View>
          {error && <Notice text={error} tone="error" />}
          <Field label="Store URL" value={baseUrl} onChangeText={setBaseUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://yourstore.pk" />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" onSubmitEditing={submit} />
          <Button title="Sign in" onPress={submit} loading={busy} style={{ marginTop: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
