import type { Metadata } from "next";
import { AuthShell } from "@/components/store/auth-shell";
import { RegisterForm } from "@/components/store/auth-forms";
export const metadata: Metadata = { title: "Create account", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) {
  const sp = await searchParams;

  return (
    <div className="py-4 sm:py-8">
      <AuthShell title="Create account" subtitle="Create an account in less than a minute.">
        <RegisterForm next={sp.next} />
      </AuthShell>
    </div>
  );
}
