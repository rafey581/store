// Branded artwork for products without photos (better than an empty grey box).
const PALETTES = [
  ["#ecfdf5", "#a7f3d0", "#047857"],
  ["#eff6ff", "#bfdbfe", "#1d4ed8"],
  ["#fff7ed", "#fed7aa", "#c2410c"],
  ["#fdf2f8", "#fbcfe8", "#be185d"],
  ["#f5f3ff", "#ddd6fe", "#6d28d9"],
  ["#f0fdfa", "#99f6e4", "#0f766e"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ProductPlaceholder({ name, className = "" }: { name: string; className?: string }) {
  const [bg, mid, fg] = PALETTES[hash(name) % PALETTES.length];
  const initials = name.split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`} style={{ background: `radial-gradient(120% 90% at 20% 10%, ${bg}, ${mid})` }} aria-hidden="true">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40" style={{ background: fg, filter: "blur(40px)" }} />
      <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-white/60" style={{ filter: "blur(30px)" }} />
      <span className="relative text-5xl font-extrabold tracking-tight" style={{ color: fg }}>{initials}</span>
    </div>
  );
}
