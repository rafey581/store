import { db } from "@/server/db";
import { requireStaff } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";
import { StaffForm } from "@/components/admin/staff-form";
import { updateStaff } from "./actions";
import { formatDate } from "@/lib/utils";
import { cardCls } from "@/components/ui/styles";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const me = await requireStaff("staff");
  const staff = await db.user.findMany({ where: { role: { in: ["OWNER", "STAFF"] } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
  const btn = (id: string, op: string, label: string, danger = false) => (
    <form action={updateStaff}><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={op} /><button className={`text-xs hover:underline ${danger ? "text-red-600" : "text-brand-700"}`}>{label}</button></form>
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Staff" description="Owner: full access. Staff: products, orders, payment proofs, customers, coupons and shipping. Only Owners manage settings, staff and refunds." />
      <section className={`${cardCls} p-5`}><h2 className="mb-3 font-semibold">Add staff member</h2><StaffForm /></section>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="p-3">Name</th><th>Role</th><th>Last login</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3"><p className="font-medium">{u.name}{u.id === me.id ? " (you)" : ""}</p><p className="text-xs text-gray-500">{u.email}</p></td>
                <td>{u.role === "OWNER" ? "Owner" : "Staff"}</td>
                <td className="text-gray-600">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</td>
                <td>{u.disabledAt ? <span className="text-red-600">Disabled</span> : "Active"}</td>
                <td className="flex flex-wrap gap-3 py-3">
                  {u.id !== me.id && (
                    <>
                      {u.role === "STAFF" ? btn(u.id, "make_owner", "Make owner") : btn(u.id, "make_staff", "Make staff")}
                      {u.disabledAt ? btn(u.id, "enable", "Enable") : btn(u.id, "disable", "Disable", true)}
                      {btn(u.id, "remove", "Remove access", true)}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
