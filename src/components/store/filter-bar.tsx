import { SlidersHorizontal } from "lucide-react";
import { SortSelect } from "./sort-select";

// Plain GET form: works without JavaScript and keeps URLs shareable/crawlable.
export function FilterBar({ action, params, sort }: { action: string; params: { q?: string; min?: string; max?: string; inStock?: string }; sort: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-[var(--shadow-soft)]">
      <form action={action} className="flex flex-wrap items-center gap-2 text-sm">
        {params.q && <input type="hidden" name="q" value={params.q} />}
        <input type="hidden" name="sort" value={sort} />
        <SlidersHorizontal size={18} className="ml-1 text-gray-400" aria-hidden="true" />
        <input name="min" inputMode="numeric" defaultValue={params.min} placeholder="Min Rs" aria-label="Minimum price in rupees" className="w-24 rounded-lg border border-gray-200 px-3 py-2 focus:border-brand-600 focus:outline-none" />
        <span className="text-gray-300">–</span>
        <input name="max" inputMode="numeric" defaultValue={params.max} placeholder="Max Rs" aria-label="Maximum price in rupees" className="w-24 rounded-lg border border-gray-200 px-3 py-2 focus:border-brand-600 focus:outline-none" />
        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 font-medium"><input type="checkbox" name="inStock" value="1" defaultChecked={params.inStock === "1"} className="h-4 w-4 accent-brand-600" /> In stock</label>
        <button className="rounded-lg bg-ink-900 px-4 py-2 font-semibold text-white hover:bg-ink-700">Apply</button>
      </form>
      <SortSelect value={sort} />
    </div>
  );
}
