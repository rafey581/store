import Link from "next/link";

export function Pagination({ page, pages, basePath, params }: { page: number; pages: number; basePath: string; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p)); else sp.delete("page");
    const q = sp.toString();
    return q ? `${basePath}?${q}` : basePath;
  };
  return (
    <nav className="mt-8 flex items-center justify-center gap-2 text-sm" aria-label="Pagination">
      {page > 1 && <Link className="rounded-lg border px-3 py-1.5 hover:bg-gray-50" href={href(page - 1)}>Previous</Link>}
      <span className="px-2 text-gray-600">Page {page} of {pages}</span>
      {page < pages && <Link className="rounded-lg border px-3 py-1.5 hover:bg-gray-50" href={href(page + 1)}>Next</Link>}
    </nav>
  );
}
