import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({ eyebrow, title, href, linkText = "View all" }: { eyebrow?: string; title: string; href?: string; linkText?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p>}
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="group flex shrink-0 items-center gap-1 text-sm font-semibold text-ink-900 hover:text-brand-700">
          {linkText} <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
