import { SortSelect } from "./sort-select";

// Plain GET form: works without JavaScript and keeps URLs shareable/crawlable.
export function FilterBar({ action, params, sort }: { action: string; params: { q?: string; min?: string; max?: string; inStock?: string }; sort: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <form action={action} className="flex flex-wrap items-end gap-2 text-sm">
        {params.q && <input type="hidden" name="q" value={params.q} />}
        <input type="hidden" name="sort" value={sort} />
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">Min Rs</span>
          <input name="min" inputMode="numeric" defaultValue={params.min} className="w-24 rounded-lg border border-gray-300 px-2 py-1.5" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">Max Rs</span>
          <input name="max" inputMode="numeric" defaultValue={params.max} className="w-24 rounded-lg border border-gray-300 px-2 py-1.5" />
        </label>
        <label className="flex items-center gap-1.5 py-1.5"><input type="checkbox" name="inStock" value="1" defaultChecked={params.inStock === "1"} /> In stock</label>
        <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium hover:bg-gray-50">Apply</button>
      </form>
      <SortSelect value={sort} />
    </div>
  );
}
