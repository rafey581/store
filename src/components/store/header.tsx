import Link from "next/link";
import { getNavCategories } from "@/server/catalog";
import { cartCount } from "@/server/cart";
import { getSettings } from "@/server/settings";
import { auth } from "@/auth";

export async function StoreHeader() {
  const [settings, categories, count, session] = await Promise.all([getSettings(), getNavCategories(), cartCount(), auth()]);
  const role = (session?.user as { role?: string } | undefined)?.role;
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <details className="relative md:hidden">
          <summary className="list-none cursor-pointer rounded-lg p-2 hover:bg-gray-100" aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </summary>
          <nav className="absolute left-0 top-11 w-64 rounded-xl border bg-white p-3 shadow-lg">
            {categories.map((c) => (
              <Link key={c.id} href={`/c/${c.slug}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50">{c.name}</Link>
            ))}
            <hr className="my-2" />
            <Link href="/track" className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50">Track order</Link>
          </nav>
        </details>
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight text-brand-700">{settings.storeName}</Link>
        <form action="/search" className="mx-2 hidden flex-1 md:block" role="search">
          <input name="q" type="search" placeholder="Search products" aria-label="Search products" className="w-full rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:border-brand-600 focus:bg-white focus:outline-none" />
        </form>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          {(role === "OWNER" || role === "STAFF") && <Link href="/admin" className="hidden rounded-lg px-3 py-2 font-medium text-gray-700 hover:bg-gray-100 sm:block">Admin</Link>}
          <Link href={session?.user ? "/account" : "/login"} className="rounded-lg px-3 py-2 font-medium text-gray-700 hover:bg-gray-100">{session?.user ? "Account" : "Sign in"}</Link>
          <Link href="/cart" className="relative rounded-lg px-3 py-2 font-medium text-gray-700 hover:bg-gray-100" aria-label={`Cart, ${count} items`}>
            Cart
            {count > 0 && <span className="ml-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-bold text-white">{count}</span>}
          </Link>
        </nav>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <form action="/search" role="search">
          <input name="q" type="search" placeholder="Search products" aria-label="Search products" className="w-full rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:outline-none" />
        </form>
      </div>
      <nav className="hidden border-t border-gray-100 md:block" aria-label="Categories">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-1.5 text-sm">
          {categories.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-100">{c.name}</Link>
          ))}
          <Link href="/track" className="ml-auto whitespace-nowrap rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-100">Track order</Link>
        </div>
      </nav>
    </header>
  );
}
