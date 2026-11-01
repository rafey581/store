import { Truck, ShieldCheck, RotateCcw, MessageCircle, Banknote } from "lucide-react";

export function TrustStrip({ cod }: { cod: boolean }) {
  const items = [
    { icon: Truck, title: "Nationwide delivery", text: "Fast shipping to every city in Pakistan" },
    cod ? { icon: Banknote, title: "Cash on delivery", text: "Pay when your order arrives" } : { icon: ShieldCheck, title: "Secure payments", text: "Cards, JazzCash, Easypaisa & bank" },
    { icon: RotateCcw, title: "Easy returns", text: "7-day hassle-free returns" },
    { icon: MessageCircle, title: "Real support", text: "Talk to us on WhatsApp" },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Why shop with us">
      {items.map(({ icon: Icon, title, text }) => (
        <div key={title} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-[var(--shadow-soft)]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon size={22} /></span>
          <div>
            <p className="text-sm font-bold text-ink-900">{title}</p>
            <p className="mt-0.5 hidden text-xs leading-relaxed text-gray-500 sm:block">{text}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

export function PaymentBadges({ dark = false }: { dark?: boolean }) {
  const names = ["Visa", "Mastercard", "JazzCash", "Easypaisa", "Bank transfer", "Cash on delivery"];
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Accepted payment methods">
      {names.map((n) => (
        <li key={n} className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${dark ? "bg-white/10 text-gray-200 ring-1 ring-white/10" : "bg-white text-ink-700 ring-1 ring-gray-200"}`}>{n}</li>
      ))}
    </ul>
  );
}
