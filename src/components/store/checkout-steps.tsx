import { Check } from "lucide-react";

const STEPS = ["Cart", "Details & payment", "Confirmation"];

export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mb-8 flex items-center gap-2 text-sm" aria-label="Checkout progress">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={s} className="flex flex-1 items-center gap-2 last:flex-none">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-brand-600 text-white" : active ? "bg-ink-900 text-white" : "bg-gray-100 text-gray-500"}`} aria-current={active ? "step" : undefined}>
              {done ? <Check size={16} /> : n}
            </span>
            <span className={`hidden whitespace-nowrap font-semibold sm:inline ${active ? "text-ink-900" : "text-gray-500"}`}>{s}</span>
            {n < STEPS.length && <span className={`h-0.5 flex-1 rounded-full ${done ? "bg-brand-600" : "bg-gray-200"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
