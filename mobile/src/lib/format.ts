// Money is integer paisa everywhere (1 PKR = 100 paisa).
export function formatPKR(paisa: number): string {
  const neg = paisa < 0;
  const abs = Math.abs(paisa);
  const whole = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = abs % 100;
  return `${neg ? "-" : ""}Rs ${whole}${frac ? "." + String(frac).padStart(2, "0") : ""}`;
}

/** "1,250.5" -> 125050; null if invalid. */
export function rupeesToPaisa(input: string): number | null {
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(input.replace(/,/g, "").trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 100 + (m[2] ? parseInt(m[2].padEnd(2, "0"), 10) : 0);
}

export function paisaToInput(paisa: number | null | undefined): string {
  if (paisa === null || paisa === undefined) return "";
  return paisa % 100 === 0 ? String(paisa / 100) : `${Math.floor(paisa / 100)}.${String(paisa % 100).padStart(2, "0")}`;
}

export function formatDate(d: string | Date): string {
  const t = new Date(new Date(d).getTime() + 5 * 3600_000); // Pakistan time, UTC+5
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const h = t.getUTCHours();
  return `${t.getUTCDate()} ${months[t.getUTCMonth()]} ${t.getUTCFullYear()}, ${((h + 11) % 12) + 1}:${String(t.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAYMENT_REVIEW: "Payment under review",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  REFUNDED: "Refunded",
};

export const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  PENDING_PAYMENT: { bg: "#fef3c7", fg: "#92400e" },
  PAYMENT_REVIEW: { bg: "#dbeafe", fg: "#1e40af" },
  PAID: { bg: "#d1fae5", fg: "#065f46" },
  PROCESSING: { bg: "#e0e7ff", fg: "#3730a3" },
  SHIPPED: { bg: "#ede9fe", fg: "#5b21b6" },
  DELIVERED: { bg: "#dcfce7", fg: "#166534" },
  CANCELLED: { bg: "#e5e7eb", fg: "#374151" },
  EXPIRED: { bg: "#e5e7eb", fg: "#374151" },
  REFUNDED: { bg: "#ffe4e6", fg: "#9f1239" },
};

export const METHOD_LABEL: Record<string, string> = {
  SAFEPAY: "Card (Safepay)",
  PAYFAST: "Card (PayFast)",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  MANUAL_TRANSFER: "Bank / wallet transfer",
  COD: "Cash on delivery",
};
