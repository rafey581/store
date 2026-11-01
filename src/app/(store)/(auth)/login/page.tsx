import type { Metadata } from "next";
import { LoginForm } from "@/components/store/auth-forms";
export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) {
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-6 text-2xl font-bold">Sign in</h1>
      <LoginForm next={sp.next} />
    </div>
  );
}
