import { readLocalPublicObject } from "@/server/storage";

// Serves product/category images stored on local disk (development without Supabase).
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const obj = await readLocalPublicObject(key.join("/"));
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(obj.buffer), { headers: { "Content-Type": obj.contentType, "Cache-Control": "public, max-age=31536000, immutable" } });
}
