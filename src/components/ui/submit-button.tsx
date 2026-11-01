"use client";
import { useFormStatus } from "react-dom";
import { btnPrimary } from "./styles";

export function SubmitButton({ children, className, pendingText, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || rest.disabled} className={className ?? btnPrimary} {...rest}>
      {pending ? pendingText ?? "Please wait…" : children}
    </button>
  );
}
