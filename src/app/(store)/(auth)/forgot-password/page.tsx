import type { Metadata } from "next";
import { ForgotForm } from "@/components/store/auth-forms";
export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) {
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-6 text-2xl font-bold">Forgot password</h1>
      <ForgotForm  />
    </div>
  );
}
