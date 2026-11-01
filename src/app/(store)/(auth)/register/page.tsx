import type { Metadata } from "next";
import { RegisterForm } from "@/components/store/auth-forms";
export const metadata: Metadata = { title: "Create account", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) {
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-6 text-2xl font-bold">Create account</h1>
      <RegisterForm next={sp.next} />
    </div>
  );
}
