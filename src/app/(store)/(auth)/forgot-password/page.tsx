import type { Metadata } from "next";
import { AuthShell } from "@/components/store/auth-shell";
import { ForgotForm } from "@/components/store/auth-forms";
export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) {
  const sp = await searchParams;

  return (
    <div className="py-4 sm:py-8">
      <AuthShell title="Forgot password" subtitle="We will email you a link to reset your password.">
        <ForgotForm  />
      </AuthShell>
    </div>
  );
}
