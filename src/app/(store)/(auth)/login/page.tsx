import type { Metadata } from "next";
import { AuthShell } from "@/components/store/auth-shell";
import { LoginForm } from "@/components/store/auth-forms";
export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) {
  const sp = await searchParams;

  return (
    <div className="py-4 sm:py-8">
      <AuthShell title="Sign in" subtitle="Welcome back! Sign in to your account.">
        <LoginForm next={sp.next} />
      </AuthShell>
    </div>
  );
}
