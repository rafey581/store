import { cache } from "react";
import { db } from "@/server/db";

export const getSettings = cache(async () => {
  const s = await db.storeSettings.findUnique({ where: { id: 1 } });
  return s ?? (await db.storeSettings.create({ data: { id: 1 } }));
});

export type Settings = Awaited<ReturnType<typeof getSettings>>;
