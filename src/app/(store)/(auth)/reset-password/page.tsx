import type { Metadata } from "next";
import { AuthShell } from "@/components/store/auth-shell";
import { ResetForm } from "@/components/store/auth-forms";
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) {
  const sp = await searchParams;

  return (
    <div className="py-4 sm:py-8">
      <AuthShell title="Choose a new password" subtitle="Choose a strong password you have not used before.">
        <ResetForm token={sp.token ?? ""} />
      </AuthShell>
    </div>
  );
}
