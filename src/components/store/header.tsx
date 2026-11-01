import Link from "next/link";
import { Search, ShoppingBag, User, Package, LayoutDashboard } from "lucide-react";
import { getNavCategories } from "@/server/catalog";
import { cartCount } from "@/server/cart";
import { getSettings } from "@/server/settings";
import { auth } from "@/auth";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";

export async function StoreHeader() {
  const [settings, categories, count, session] = await Promise.all([getSettings(), getNavCategories(), cartCount(), auth()]);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isStaff = role === "OWNER" || role === "STAFF";
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 lg:h-[72px]">
        <MobileMenu categories={categories} storeName={settings.storeName} signedIn={Boolean(session?.user)} />
        <Logo name={settings.storeName} />
        <form action="/search" className="mx-6 hidden max-w-xl flex-1 lg:block" role="search">
          <label className="group flex items-center gap-2 rounded-full border border-transparent bg-gray-100 px-4 py-2.5 transition focus-within:border-brand-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-600/10">
            <Search size={18} className="text-gray-500" />
            <input name="q" type="search" placeholder="Search for products, brands and more" aria-label="Search products" className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500" />
          </label>
        </form>
        <nav className="ml-auto flex items-center gap-1" aria-label="Account">
          <Link href="/search" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-gray-100 lg:hidden" aria-label="Search"><Search size={20} /></Link>
          {isStaff && (
            <Link href="/admin" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-gray-100 md:flex"><LayoutDashboard size={18} /> Admin</Link>
          )}
          <Link href="/track" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-gray-100 md:flex"><Package size={18} /> Track</Link>
          <Link href={session?.user ? "/account" : "/login"} className="flex h-10 items-center gap-2 rounded-xl px-2.5 text-sm font-semibold hover:bg-gray-100 sm:px-3" aria-label={session?.user ? "My account" : "Sign in"}>
            <User size={20} /> <span className="hidden sm:inline">{session?.user ? "Account" : "Sign in"}</span>
          </Link>
          <Link href="/cart" className="relative flex h-10 items-center gap-2 rounded-xl bg-ink-900 px-3 text-sm font-semibold text-white transition hover:bg-ink-700" aria-label={`Cart, ${count} items`}>
            <ShoppingBag size={19} />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[11px] font-bold">{count}</span>}
          </Link>
        </nav>
      </div>
      <nav className="hidden border-t border-gray-100 lg:block" aria-label="Categories">
        <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4">
          <Link href="/search" className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-ink-900 hover:text-brand-700">All products</Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="relative whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-600 transition after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-brand-600 after:transition hover:text-ink-900 hover:after:scale-x-100">
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
