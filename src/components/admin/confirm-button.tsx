"use client";
import { btnDanger } from "@/components/ui/styles";

export function ConfirmButton({ message, children, className }: { message: string; children: React.ReactNode; className?: string }) {
  return (
    <button type="submit" className={className ?? btnDanger} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
