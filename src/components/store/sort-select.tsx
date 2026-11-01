"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <select
      aria-label="Sort products"
      value={value}
      onChange={(e) => {
        const p = new URLSearchParams(sp.toString());
        p.set("sort", e.target.value);
        p.delete("page");
        router.push(`${pathname}?${p.toString()}`);
      }}
      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
    >
      <option value="newest">Newest</option>
      <option value="price-asc">Price: low to high</option>
      <option value="price-desc">Price: high to low</option>
      <option value="name">Name</option>
    </select>
  );
}
