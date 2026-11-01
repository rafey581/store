import Link from "next/link";

export function Logo({ name, dark = false }: { name: string; dark?: boolean }) {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2" aria-label={`${name} home`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[var(--shadow-glow)] transition group-hover:scale-105">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7V6a3 3 0 0 1 6 0v1" /></svg>
      </span>
      <span className={`text-lg font-extrabold tracking-tight ${dark ? "text-white" : "text-ink-900"}`}>{name}</span>
    </Link>
  );
}
