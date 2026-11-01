import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Device from "expo-device";
import { User, clearSession, loadSession, login, logoutRemote, onSignedOut } from "./api";
import { registerForPush, unregisterPush } from "./push";

type AuthState = {
  status: "loading" | "signedOut" | "signedIn";
  user: User | null;
  signIn: (baseUrl: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  useEffect(() => {
    onSignedOut(() => {
      setUser(null);
      setStatus("signedOut");
    });
    loadSession().then((u) => {
      setUser(u);
      setStatus(u ? "signedIn" : "signedOut");
      if (u) registerForPush().catch(() => {});
    });
  }, []);

  const signIn = useCallback(async (baseUrl: string, email: string, password: string) => {
    const u = await login(baseUrl, email, password, Device.modelName ?? "Android phone");
    setUser(u);
    setStatus("signedIn");
    registerForPush().catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    const token = await unregisterPush();
    await logoutRemote(token);
    await clearSession();
    setUser(null);
    setStatus("signedOut");
  }, []);

  const value = useMemo(() => ({ status, user, signIn, signOut }), [status, user, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
