import type { Metadata } from "next";
import { ResetForm } from "@/components/store/auth-forms";
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) {
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-6 text-2xl font-bold">Choose a new password</h1>
      <ResetForm token={sp.token ?? ""} />
    </div>
  );
}
