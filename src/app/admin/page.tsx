import { requireStaff } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/page-header";

export default async function DashboardPage() {
  const user = await requireStaff();
  return <PageHeader title="Dashboard" description={`Welcome, ${user.name || user.email}.`} />;
}
