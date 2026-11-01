import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";

/** Sends signed-out users to the login screen (for screens outside the tab group, e.g. deep links). */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === "signedOut") return <Redirect href="/login" />;
  if (status === "loading") return null;
  return <>{children}</>;
}
