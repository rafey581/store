import { cache } from "react";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";

export const getFooterPages = cache(async () =>
  db.page.findMany({ where: { isPublished: true, showInFooter: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }], select: { slug: true, title: true } }),
);

/** Placeholders usable in page content: {{storeName}}, {{supportEmail}}, {{supportPhone}}, {{whatsapp}}, {{address}}. */
export async function pageVars(): Promise<Record<string, string>> {
  const s = await getSettings();
  return { storeName: s.storeName, supportEmail: s.supportEmail ?? "", supportPhone: s.supportPhone ?? "", whatsapp: s.whatsappNumber ?? "", address: s.address ?? "" };
}

export { DEFAULT_PAGES } from "./pages-defaults";
