import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { can, type Permission } from "@/lib/permissions";

/** The signed-in user, re-read from the database on every call so that a
 *  disabled account or a role change takes effect immediately. */
export async function getCurrentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const row = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, phone: true, role: true, disabledAt: true, passwordChangedAt: true },
  });
  if (!row || row.disabledAt) return null;
  // Sessions created before the last password change/reset are no longer valid.
  const loginAt = (session as { loginAt?: number }).loginAt ?? 0;
  if (row.passwordChangedAt && loginAt < row.passwordChangedAt.getTime() - 1000) return null;
  const { passwordChangedAt: _pc, ...user } = row;
  void _pc;
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Server-side role check for every admin page and server action. */
export async function requireStaff(perm: Permission = "dashboard"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!can(user.role, perm)) {
    if (can(user.role, "dashboard")) redirect("/admin?denied=1");
    redirect("/");
  }
  return user;
}

export async function requireOwner(): Promise<CurrentUser> {
  return requireStaff("settings");
}

export async function requireCustomer(next = "/account"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}
