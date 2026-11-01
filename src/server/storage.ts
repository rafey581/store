import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

// Supabase Storage when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set,
// otherwise the local disk (development only).
//   public bucket  -> product images (public URLs)
//   private bucket -> payment proof screenshots (admins only, signed URLs)

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUBLIC_BUCKET = process.env.SUPABASE_PUBLIC_BUCKET || "product-images";
const PRIVATE_BUCKET = process.env.SUPABASE_PRIVATE_BUCKET || "payment-proofs";
const useSupabase = Boolean(SUPABASE_URL && SERVICE_KEY);

const LOCAL_PUBLIC_DIR = path.join(process.cwd(), ".data", "public");
const LOCAL_PRIVATE_DIR = path.join(process.cwd(), ".data", "private");

export type Visibility = "public" | "private";

const ALLOWED: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { ext: "webp", magic: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Validates an uploaded image by size and magic bytes (not the client's content-type). */
export async function readImageFile(file: File): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) throw new Error("Please choose an image file.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image must be 5 MB or smaller.");
  const buffer = Buffer.from(await file.arrayBuffer());
  for (const [contentType, def] of Object.entries(ALLOWED)) {
    if (def.magic(buffer)) return { buffer, contentType, ext: def.ext };
  }
  throw new Error("Only JPG, PNG or WebP images are allowed.");
}

function newKey(prefix: string, ext: string) {
  const d = new Date();
  return `${prefix}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(12).toString("hex")}.${ext}`;
}

function safeLocalPath(dir: string, key: string) {
  const p = path.join(dir, key);
  if (!p.startsWith(dir + path.sep)) throw new Error("Invalid storage key");
  return p;
}

export async function putObject(visibility: Visibility, prefix: string, buffer: Buffer, contentType: string, ext: string): Promise<{ key: string; url: string | null }> {
  const key = newKey(prefix, ext);
  if (useSupabase) {
    const bucket = visibility === "public" ? PUBLIC_BUCKET : PRIVATE_BUCKET;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY!, "Content-Type": contentType, "x-upsert": "false", "cache-control": "31536000" },
      body: new Uint8Array(buffer),
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
    return { key, url: visibility === "public" ? `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}` : null };
  }
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_STORAGE) {
    throw new Error("Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const dir = visibility === "public" ? LOCAL_PUBLIC_DIR : LOCAL_PRIVATE_DIR;
  const file = safeLocalPath(dir, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buffer);
  return { key, url: visibility === "public" ? `/media/${key}` : null };
}

export async function deleteObject(visibility: Visibility, key: string): Promise<void> {
  try {
    if (useSupabase) {
      const bucket = visibility === "public" ? PUBLIC_BUCKET : PRIVATE_BUCKET;
      await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY!, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [key] }),
      });
      return;
    }
    const dir = visibility === "public" ? LOCAL_PUBLIC_DIR : LOCAL_PRIVATE_DIR;
    await fs.unlink(safeLocalPath(dir, key));
  } catch (e) {
    console.error("deleteObject failed", key, e);
  }
}

/** For private objects. Supabase: returns a short-lived signed URL.
 *  Local: returns the file bytes (caller streams them after its own auth check). */
export async function readPrivateObject(key: string): Promise<{ redirect: string } | { buffer: Buffer; contentType: string }> {
  if (useSupabase) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${PRIVATE_BUCKET}/${key}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 120 }),
    });
    if (!res.ok) throw new Error(`Could not sign URL (${res.status})`);
    const json = (await res.json()) as { signedURL?: string; signedUrl?: string };
    const signed = json.signedURL || json.signedUrl;
    if (!signed) throw new Error("No signed URL returned");
    return { redirect: `${SUPABASE_URL}/storage/v1${signed}` };
  }
  const buffer = await fs.readFile(safeLocalPath(LOCAL_PRIVATE_DIR, key));
  const ext = key.split(".").pop();
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { buffer, contentType };
}

/** Local development only: bytes of a public object (served by /media/[...key]). */
export async function readLocalPublicObject(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (useSupabase) return null;
  try {
    const buffer = await fs.readFile(safeLocalPath(LOCAL_PUBLIC_DIR, key));
    const ext = key.split(".").pop();
    return { buffer, contentType: ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg" };
  } catch {
    return null;
  }
}
