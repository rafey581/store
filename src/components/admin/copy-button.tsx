"use client";
import { useState } from "react";
import { btnSecondary } from "@/components/ui/styles";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className={btnSecondary} onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }}>
      {copied ? "Copied" : "Copy address"}
    </button>
  );
}
