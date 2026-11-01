// All money in this app is integer PAISA (1 PKR = 100 paisa).
// This file is the only place that converts between paisa and rupee text.

const fmt0 = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });
const fmt2 = new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 125000 -> "Rs 1,250"; 125050 -> "Rs 1,250.50" */
export function formatPKR(paisa: number): string {
  if (!Number.isInteger(paisa)) throw new Error("formatPKR expects integer paisa");
  const neg = paisa < 0;
  const abs = Math.abs(paisa);
  const rupees = abs / 100;
  const text = abs % 100 === 0 ? fmt0.format(rupees) : fmt2.format(rupees);
  return `${neg ? "-" : ""}Rs ${text}`;
}

/** Rupee string from an admin form ("1250", "1,250.5") -> paisa. Returns null if invalid. */
export function rupeesToPaisa(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const s = String(input).replace(/,/g, "").trim();
  if (s === "") return null;
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const whole = parseInt(m[1], 10);
  const frac = m[2] ? parseInt(m[2].padEnd(2, "0"), 10) : 0;
  const v = whole * 100 + frac;
  return v <= 2_147_483_647 ? v : null;
}

/** Paisa -> plain rupee string for form inputs: 125050 -> "1250.50", 125000 -> "1250" */
export function paisaToRupeeInput(paisa: number | null | undefined): string {
  if (paisa === null || paisa === undefined) return "";
  const whole = Math.trunc(paisa / 100);
  const frac = Math.abs(paisa % 100);
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0")}`;
}
