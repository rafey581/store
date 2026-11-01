export type StaffRole = "OWNER" | "STAFF";

export type Permission =
  | "dashboard"
  | "products"
  | "orders"
  | "proofs"
  | "customers"
  | "coupons"
  | "shipping"
  | "settings"
  | "staff"
  | "refunds";

const MATRIX: Record<StaffRole, Permission[]> = {
  OWNER: ["dashboard", "products", "orders", "proofs", "customers", "coupons", "shipping", "settings", "staff", "refunds"],
  STAFF: ["dashboard", "products", "orders", "proofs", "customers", "coupons", "shipping"],
};

export function can(role: string | null | undefined, perm: Permission): boolean {
  if (role !== "OWNER" && role !== "STAFF") return false;
  return MATRIX[role].includes(perm);
}
