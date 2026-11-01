"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white print:hidden">Print</button>;
}
