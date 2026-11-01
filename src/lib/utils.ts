export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function cityKey(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, " ");
}

export function orderLabel(n: number): string {
  return `#${n}`;
}

export function formatDate(d: Date | string, withTime = true): string {
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(d));
}

/** Calendar day in Pakistan as a UTC-midnight Date (for @db.Date columns). */
export function karachiDay(d = new Date()): Date {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return new Date(`${s}T00:00:00.000Z`);
}

export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

/** Normalizes Pakistani mobile numbers to 03XXXXXXXXX when possible. */
export function normalizePkPhone(input: string): string {
  const digits = input.replace(/[^\d]/g, "");
  if (digits.startsWith("92") && digits.length === 12) return "0" + digits.slice(2);
  if (digits.length === 10 && digits.startsWith("3")) return "0" + digits;
  return digits;
}
