import { Check, Package, Truck, Home, ClipboardCheck } from "lucide-react";

const STEPS = [
  { key: "placed", label: "Order placed", icon: ClipboardCheck },
  { key: "confirmed", label: "Confirmed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

function stepIndex(status: string): number {
  if (status === "DELIVERED") return 3;
  if (status === "SHIPPED") return 2;
  if (status === "PAID" || status === "PROCESSING") return 1;
  return 0;
}

export function OrderProgress({ status }: { status: string }) {
  if (["CANCELLED", "EXPIRED", "REFUNDED"].includes(status)) return null;
  const current = stepIndex(status);
  return (
    <ol className="grid grid-cols-4 gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-[var(--shadow-soft)] sm:p-6" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const done = i <= current;
        const Icon = i < current ? Check : s.icon;
        return (
          <li key={s.key} className="relative flex flex-col items-center text-center">
            {i > 0 && <span className={`absolute right-1/2 top-5 h-0.5 w-full -translate-y-1/2 ${i <= current ? "bg-brand-600" : "bg-gray-200"}`} aria-hidden="true" />}
            <span className={`relative grid h-10 w-10 place-items-center rounded-full ring-4 ring-white ${done ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-400"}`} aria-current={i === current ? "step" : undefined}>
              <Icon size={18} />
            </span>
            <span className={`mt-2 text-xs font-semibold sm:text-sm ${done ? "text-ink-900" : "text-gray-400"}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
