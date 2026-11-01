import { ShieldCheck, Truck, Banknote } from "lucide-react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-[var(--shadow-lift)] md:grid-cols-2">
      <div className="bg-hero relative hidden p-10 text-white md:block">
        <div className="bg-dots absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative flex h-full flex-col">
          <p className="text-3xl font-extrabold leading-tight tracking-tight">Shopping made <span className="text-gradient">simple</span>.</p>
          <p className="mt-3 text-gray-300">Track orders, save addresses and check out faster.</p>
          <ul className="mt-auto space-y-4 pt-10 text-sm text-gray-200">
            <li className="flex items-center gap-3"><Truck size={20} className="text-brand-300" /> Delivery across Pakistan</li>
            <li className="flex items-center gap-3"><Banknote size={20} className="text-brand-300" /> Card, wallets, bank or cash on delivery</li>
            <li className="flex items-center gap-3"><ShieldCheck size={20} className="text-brand-300" /> Your data stays private</li>
          </ul>
        </div>
      </div>
      <div className="p-8 sm:p-10">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
