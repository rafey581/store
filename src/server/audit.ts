import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

export async function audit(actorId: string | null, action: string, entityType: string, entityId: string | null, data?: Prisma.InputJsonValue) {
  try {
    await db.auditLog.create({ data: { actorId, action, entityType, entityId, data } });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
