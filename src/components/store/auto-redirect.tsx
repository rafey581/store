"use client";
import { useEffect } from "react";

/** Full-page navigation (not a client-side route change) to a payment start URL. */
export function AutoRedirect({ href, label }: { href: string; label: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);
  return (
    <p className="rounded-xl bg-blue-50 p-4 text-blue-800">
      Redirecting you to {label}… If nothing happens, <a href={href} className="font-semibold underline">click here</a>.
    </p>
  );
}
