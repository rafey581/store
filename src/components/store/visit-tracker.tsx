"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const body = JSON.stringify({ path: pathname });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track/visit", new Blob([body], { type: "application/json" }));
      else fetch("/api/track/visit", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    } catch {}
  }, [pathname]);
  return null;
}
