"use client";
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-xl border bg-white p-8 text-center">
      <h1 className="text-xl font-bold">This page failed to load</h1>
      <p className="mt-2 text-sm text-gray-600">{error.digest ? `Reference: ${error.digest}` : "Please try again."}</p>
      <button onClick={reset} className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Try again</button>
    </div>
  );
}
