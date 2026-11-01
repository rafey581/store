"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-gray-600">Please try again. If the problem continues, contact us.</p>
      <div className="mt-6 flex justify-center gap-4">
        <button onClick={reset} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Try again</button>
        <Link href="/" className="rounded-lg border px-4 py-2 text-sm font-semibold">Home</Link>
      </div>
      {error.digest && <p className="mt-4 text-xs text-gray-400">Error reference: {error.digest}</p>}
    </div>
  );
}
