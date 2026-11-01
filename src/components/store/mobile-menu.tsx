"use client";
import { useRef } from "react";
import Link from "next/link";
import { Menu, X, ChevronRight, Package, User, Search } from "lucide-react";

type Cat = { id: string; name: string; slug: string; children: { name: string; slug: string }[] };

// Native <dialog> drawer: focus trap, Esc to close and backdrop come for free.
export function MobileMenu({ categories, storeName, signedIn }: { categories: Cat[]; storeName: string; signedIn: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="grid h-10 w-10 place-items-center rounded-xl text-ink-900 hover:bg-gray-100 lg:hidden" aria-label="Open menu">
        <Menu size={22} />
      </button>
      <dialog ref={ref} className="drawer bg-white" aria-label="Menu" onClick={(e) => e.target === ref.current && close()}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <span className="text-lg font-extrabold">{storeName}</span>
            <button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-gray-100" aria-label="Close menu"><X size={20} /></button>
          </div>
          <form action="/search" className="px-5 pt-4" onSubmit={close}>
            <label className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5">
              <Search size={18} className="text-gray-500" />
              <input name="q" type="search" placeholder="Search products" className="w-full bg-transparent text-sm outline-none" />
            </label>
          </form>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Shop</p>
            <Link href="/search" onClick={close} className="flex items-center justify-between rounded-xl px-3 py-3 font-medium hover:bg-gray-50">All products <ChevronRight size={18} className="text-gray-400" /></Link>
            {categories.map((c) => (
              <div key={c.id}>
                <Link href={`/c/${c.slug}`} onClick={close} className="flex items-center justify-between rounded-xl px-3 py-3 font-medium hover:bg-gray-50">{c.name} <ChevronRight size={18} className="text-gray-400" /></Link>
                {c.children.map((ch) => <Link key={ch.slug} href={`/c/${ch.slug}`} onClick={close} className="block rounded-xl py-2 pl-7 pr-3 text-sm text-gray-600 hover:bg-gray-50">{ch.name}</Link>)}
              </div>
            ))}
            <p className="px-2 pb-2 pt-5 text-xs font-semibold uppercase tracking-wider text-gray-400">Help</p>
            <Link href="/track" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 font-medium hover:bg-gray-50"><Package size={18} /> Track order</Link>
            <Link href={signedIn ? "/account" : "/login"} onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 font-medium hover:bg-gray-50"><User size={18} /> {signedIn ? "My account" : "Sign in"}</Link>
          </nav>
        </div>
      </dialog>
    </>
  );
}
