// Shared helpers for gateway providers.

export function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function envOr(name: string, fallback: string): string {
  return env(name) ?? fallback;
}

export function isSandbox(prefix: string): boolean {
  return (env(`${prefix}_ENV`) ?? "sandbox") !== "production";
}

/** Date parts in Pakistan time (UTC+5, no DST). */
export function pkParts(d: Date) {
  const t = new Date(d.getTime() + 5 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return { y: String(t.getUTCFullYear()), m: p(t.getUTCMonth() + 1), d: p(t.getUTCDate()), H: p(t.getUTCHours()), M: p(t.getUTCMinutes()), S: p(t.getUTCSeconds()) };
}

export async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 15000);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

/** Parses an application/x-www-form-urlencoded or JSON body into a flat string map. */
export function parseBody(rawBody: string, contentType: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!rawBody) return out;
  if (contentType.includes("application/json")) {
    try {
      const j = JSON.parse(rawBody) as Record<string, unknown>;
      for (const [k, v] of Object.entries(j)) if (v !== null && typeof v !== "object") out[k] = String(v);
    } catch {}
    return out;
  }
  for (const [k, v] of new URLSearchParams(rawBody)) out[k] = v;
  return out;
}

const SECRET_KEYS = /password|secret|salt|hash_?key|secured_key|token|pp_SecureHash|merchantHashedReq/i;

/** Removes credential-like fields before a payload is stored in the database. */
export function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = SECRET_KEYS.test(k) ? "[redacted]" : v;
  return out;
}

/** "8097.30" / "8097.3" / 8097.3 -> 809730 paisa, or null. */
export function rupeeStringToPaisa(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/,/g, "").trim();
  const m = /^(\d+)(?:\.(\d{1,2})\d*)?$/.exec(s);
  if (!m) return null;
  return parseInt(m[1], 10) * 100 + (m[2] ? parseInt(m[2].padEnd(2, "0"), 10) : 0);
}

export function paisaToRupeeString(paisa: number, decimals = 2): string {
  const whole = Math.trunc(paisa / 100);
  const frac = String(paisa % 100).padStart(2, "0");
  return decimals === 1 ? `${whole}.${frac[1] === "0" ? frac[0] : frac}` : `${whole}.${frac}`;
}
