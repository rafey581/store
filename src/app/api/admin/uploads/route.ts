import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { can } from "@/lib/permissions";
import { putObject, readImageFile } from "@/server/storage";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "products")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  try {
    const img = await readImageFile(file);
    const folder = form.get("folder") === "categories" ? "categories" : "products";
    const { key, url } = await putObject("public", folder, img.buffer, img.contentType, img.ext);
    return NextResponse.json({ key, url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
