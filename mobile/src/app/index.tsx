import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { C } from "@/components/ui";

export default function Index() {
  const { status } = useAuth();
  if (status === "loading") return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={C.brand} size="large" /></View>;
  return <Redirect href={status === "signedIn" ? "/(tabs)" : "/login"} />;
}
