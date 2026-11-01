import { storage } from "./storage";
import Constants from "expo-constants";

// API client for the store's /api/mobile endpoints.
// Access token: 15 minutes, kept in memory + SecureStore. Refresh token: rotated on
// every refresh and stored only in SecureStore (Android Keystore-backed).

export type User = { id: string; name: string | null; email: string; role: "OWNER" | "STAFF" };

const K = { base: "apiBase", access: "accessToken", refresh: "refreshToken", user: "user", push: "expoPushToken" };

let baseUrl = "";
let accessToken: string | null = null;
let refreshToken: string | null = null;
let signedOutListener: (() => void) | null = null;

// Requests wait until the saved session has been read from storage. This matters on a cold
// start from a notification tap, when a detail screen mounts before the auth provider finishes.
let markReady: () => void = () => {};
const sessionReady = new Promise<void>((r) => (markReady = r));

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function defaultBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return (extra?.apiUrl ?? "").replace(/\/$/, "");
}

export function normalizeBaseUrl(input: string): string {
  let s = input.trim().replace(/\/+$/, "");
  if (s && !/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s;
}

export function getBaseUrl() {
  return baseUrl;
}

export function onSignedOut(fn: () => void) {
  signedOutListener = fn;
}

export async function loadSession(): Promise<User | null> {
  baseUrl = (await storage.get(K.base)) ?? defaultBaseUrl();
  accessToken = await storage.get(K.access);
  refreshToken = await storage.get(K.refresh);
  const u = await storage.get(K.user);
  markReady();
  return refreshToken && u ? (JSON.parse(u) as User) : null;
}

async function saveTokens(t: { accessToken: string; refreshToken: string; user?: User }) {
  accessToken = t.accessToken;
  refreshToken = t.refreshToken;
  await storage.set(K.access, t.accessToken);
  await storage.set(K.refresh, t.refreshToken);
  if (t.user) await storage.set(K.user, JSON.stringify(t.user));
}

export async function clearSession() {
  accessToken = null;
  refreshToken = null;
  await Promise.all([K.access, K.refresh, K.user].map((k) => storage.del(k)));
}

export async function getStoredPushToken() {
  return storage.get(K.push);
}
export async function setStoredPushToken(t: string | null) {
  if (t) await storage.set(K.push, t);
  else await storage.del(K.push);
}

async function parse(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    // Not JSON (e.g. a proxy or HTML error page): never treat it as data.
    throw new ApiError(`Unexpected response from the store (${res.status}). Check the store URL.`, res.status || 0);
  }
}

export async function login(base: string, email: string, password: string, deviceName: string): Promise<User> {
  const url = normalizeBaseUrl(base);
  let res: Response;
  try {
    res = await fetch(`${url}/api/mobile/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, deviceName }) });
  } catch {
    throw new ApiError("Could not reach the store. Check the store URL and your internet connection.", 0);
  }
  const j = await parse(res);
  if (!res.ok) throw new ApiError(j.error ?? "Sign in failed", res.status);
  baseUrl = url;
  await storage.set(K.base, url);
  await saveTokens(j);
  return j.user as User;
}

let refreshing: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${baseUrl}/api/mobile/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) });
      if (!res.ok) {
        if (res.status === 401) {
          await clearSession();
          signedOutListener?.();
        }
        return false;
      }
      await saveTokens(await parse(res));
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  await sessionReady;
  if (!baseUrl || !refreshToken) throw new ApiError("Please sign in.", 401);
  const doFetch = () =>
    fetch(`${baseUrl}${path}`, {
      method: opts.method ?? "GET",
      headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  let res: Response;
  try {
    res = await doFetch();
    if (res.status === 401 && (await refresh())) res = await doFetch();
  } catch {
    throw new ApiError("No connection to the store. Pull down to try again.", 0);
  }
  const j = await parse(res);
  if (!res.ok) throw new ApiError(j.error ?? `Request failed (${res.status})`, res.status);
  return j as T;
}

/** Headers for loading protected images (payment screenshots). */
export function authHeaders(): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

/** Makes a relative URL from the API absolute (e.g. /media/... product images). */
export function absUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  return /^https?:\/\//.test(u) ? u : `${baseUrl}${u}`;
}

export async function logoutRemote(pushToken: string | null) {
  try {
    await fetch(`${baseUrl}/api/mobile/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify({ refreshToken, expoPushToken: pushToken }),
    });
  } catch {}
}
