import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/server/db";

// Mobile app auth: short-lived access JWT (HS256) + rotating refresh token.
// Refresh tokens are stored only as SHA-256 hashes. Reusing a rotated token
// revokes every session of that user (token theft detection).

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_DAYS = 30;
const ISSUER = "store-api";
const AUDIENCE = "store-mobile";

function secret() {
  const s = process.env.MOBILE_JWT_SECRET;
  if (!s || s.length < 32) throw new Error("MOBILE_JWT_SECRET must be set (32+ characters)");
  return new TextEncoder().encode(s);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function issueTokens(user: { id: string; role: string }, deviceName: string | null) {
  const accessToken = await new SignJWT({ role: user.role, typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(secret());
  const refreshToken = randomBytes(48).toString("base64url");
  const row = await db.refreshToken.create({ data: { userId: user.id, tokenHash: sha256(refreshToken), deviceName: deviceName?.slice(0, 100) ?? null, expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86400_000) } });
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS, refreshTokenId: row.id };
}

export async function rotateRefreshToken(token: string) {
  const row = await db.refreshToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!row) return null;
  if (row.revokedAt) {
    // Reuse of a rotated/revoked token: revoke all sessions for safety.
    await db.refreshToken.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return null;
  }
  if (row.expiresAt < new Date() || row.user.disabledAt || (row.user.role !== "OWNER" && row.user.role !== "STAFF")) return null;
  const next = await issueTokens(row.user, row.deviceName);
  const res = await db.refreshToken.updateMany({ where: { id: row.id, revokedAt: null }, data: { revokedAt: new Date(), replacedBy: next.refreshTokenId } });
  if (res.count !== 1) return null; // concurrent rotation
  return { ...next, user: row.user };
}

export async function revokeRefreshToken(token: string) {
  await db.refreshToken.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
}

/** Staff user from a `Authorization: Bearer <access token>` header, re-checked against the database. */
export async function verifyMobileRequest(req: Request) {
  const header = req.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return null;
  try {
    const { payload } = await jwtVerify(m[1], secret(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
    if (payload.typ !== "access" || !payload.sub) return null;
    const user = await db.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, name: true, phone: true, role: true, disabledAt: true } });
    if (!user || user.disabledAt) return null;
    return user;
  } catch {
    return null;
  }
}
