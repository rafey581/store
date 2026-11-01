import { headers } from "next/headers";
import { db } from "@/server/db";

/** Fixed-window limiter stored in Postgres (works across serverless instances).
 *  Returns true if the call is allowed. */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  const reset = new Date(now.getTime() + windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${reset})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  return (rows[0]?.count ?? 0) <= limit;
}

export function ipFromHeaders(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function clientIp(): Promise<string> {
  return ipFromHeaders(await headers());
}
