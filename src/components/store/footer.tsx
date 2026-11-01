import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { getSettings } from "@/server/settings";
import { getFooterPages } from "@/server/pages";
import { getNavCategories } from "@/server/catalog";
import { Logo } from "./logo";
import { PaymentBadges } from "./trust-strip";

export async function StoreFooter() {
  const [s, pages, categories] = await Promise.all([getSettings(), getFooterPages(), getNavCategories()]);
  const wa = s.whatsappNumber?.replace(/[^\d]/g, "").replace(/^0/, "92");
  return (
    <footer className="mt-20 bg-ink-900 text-gray-400">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo name={s.storeName} dark />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">Quality products delivered across Pakistan. Shop with confidence: secure payments, easy returns and friendly support.</p>
          <ul className="mt-5 space-y-2 text-sm">
            {s.supportPhone && <li className="flex items-center gap-2"><Phone size={16} className="text-brand-400" /><a className="hover:text-white" href={`tel:${s.supportPhone}`}>{s.supportPhone}</a></li>}
            {wa && <li className="flex items-center gap-2"><MessageCircle size={16} className="text-brand-400" /><a className="hover:text-white" href={`https://wa.me/${wa}`}>WhatsApp {s.whatsappNumber}</a></li>}
            {s.supportEmail && <li className="flex items-center gap-2"><Mail size={16} className="text-brand-400" /><a className="hover:text-white" href={`mailto:${s.supportEmail}`}>{s.supportEmail}</a></li>}
            {s.address && <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-brand-400" /><span className="whitespace-pre-line">{s.address}</span></li>}
          </ul>
        </div>
        <div>
          <p className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Shop</p>
          <ul className="space-y-2.5 text-sm">
            <li><Link className="hover:text-white" href="/search">All products</Link></li>
            {categories.slice(0, 6).map((c) => <li key={c.id}><Link className="hover:text-white" href={`/c/${c.slug}`}>{c.name}</Link></li>)}
          </ul>
        </div>
        <div>
          <p className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Customer care</p>
          <ul className="space-y-2.5 text-sm">
            <li><Link className="hover:text-white" href="/track">Track your order</Link></li>
            <li><Link className="hover:text-white" href="/account">My account</Link></li>
            <li><Link className="hover:text-white" href="/cart">Shopping cart</Link></li>
          </ul>
        </div>
        {pages.length > 0 && (
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Information</p>
            <ul className="space-y-2.5 text-sm">
              {pages.map((p) => <li key={p.slug}><Link className="hover:text-white" href={`/pages/${p.slug}`}>{p.title}</Link></li>)}
            </ul>
          </div>
        )}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-6 text-xs md:flex-row md:items-center">
          <PaymentBadges dark />
          <div className="text-left md:text-right">
            <p>© {new Date().getFullYear()} {s.storeName}. All rights reserved.</p>
            <p className="mt-1">
              Developed by{" "}
              <a href="https://rafey.me" target="_blank" rel="noopener" className="font-semibold text-gray-200 hover:text-brand-400 hover:underline">
                Xast Solutions
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
