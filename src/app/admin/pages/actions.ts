"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/session";
import { DEFAULT_PAGES } from "@/server/pages-defaults";
import { slugify } from "@/lib/utils";
import { audit } from "@/server/audit";
import type { ActionState } from "@/components/ui/form-message";

const schema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(100).optional(),
  content: z.string().max(50000),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  isPublished: z.string().optional(),
  showInFooter: z.string().optional(),
});

export async function savePage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireOwner();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const slug = slugify(d.slug || d.title);
  if (!slug) return { error: "Invalid URL slug." };
  const clash = await db.page.findFirst({ where: { slug, NOT: d.id ? { id: d.id } : undefined } });
  if (clash) return { error: "Another page uses this URL." };
  const data = { title: d.title, slug, content: d.content, sortOrder: d.sortOrder, isPublished: d.isPublished === "on", showInFooter: d.showInFooter === "on" };
  const page = d.id ? await db.page.update({ where: { id: d.id }, data }) : await db.page.create({ data });
  await audit(user.id, d.id ? "page.update" : "page.create", "Page", page.id, { slug });
  revalidatePath("/", "layout");
  if (!d.id) redirect(`/admin/pages/${page.id}`);
  return { ok: "Page saved." };
}

export async function deletePage(formData: FormData) {
  const user = await requireOwner();
  const id = String(formData.get("id"));
  await db.page.delete({ where: { id } }).catch(() => null);
  await audit(user.id, "page.delete", "Page", id);
  revalidatePath("/", "layout");
  redirect("/admin/pages");
}

export async function createDefaultPages() {
  const user = await requireOwner();
  for (const p of DEFAULT_PAGES) {
    await db.page.upsert({ where: { slug: p.slug }, update: {}, create: p });
  }
  await audit(user.id, "page.defaults", "Page", null);
  revalidatePath("/", "layout");
}
