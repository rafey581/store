import Link from "next/link";
import { getSettings } from "@/server/settings";

export async function StoreFooter() {
  const s = await getSettings();
  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-gray-600 sm:grid-cols-3">
        <div>
          <p className="font-semibold text-gray-900">{s.storeName}</p>
          {s.address && <p className="mt-2 whitespace-pre-line">{s.address}</p>}
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">Customer care</p>
          {s.supportPhone && <p>Phone: <a className="hover:underline" href={`tel:${s.supportPhone}`}>{s.supportPhone}</a></p>}
          {s.whatsappNumber && <p>WhatsApp: <a className="hover:underline" href={`https://wa.me/${s.whatsappNumber.replace(/[^\d]/g, "").replace(/^0/, "92")}`}>{s.whatsappNumber}</a></p>}
          {s.supportEmail && <p>Email: <a className="hover:underline" href={`mailto:${s.supportEmail}`}>{s.supportEmail}</a></p>}
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">Orders</p>
          <p><Link className="hover:underline" href="/track">Track your order</Link></p>
          <p><Link className="hover:underline" href="/account">My account</Link></p>
          <p>Delivery across Pakistan. Prices in PKR.</p>
        </div>
      </div>
      <div className="pb-6 text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} {s.storeName}</p>
        <p className="mt-1">
          Developed by{" "}
          <a href="https://rafey.me" target="_blank" rel="noopener" className="font-medium text-gray-600 hover:text-brand-700 hover:underline">
            Xast Solutions
          </a>
        </p>
      </div>
    </footer>
  );
}
