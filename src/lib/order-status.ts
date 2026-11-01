import type { OrderStatus } from "@/generated/prisma/enums";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
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

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  PAYMENT_REVIEW: "bg-blue-100 text-blue-800",
  PAID: "bg-emerald-100 text-emerald-800",
  PROCESSING: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-violet-100 text-violet-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-200 text-gray-700",
  EXPIRED: "bg-gray-200 text-gray-700",
  REFUNDED: "bg-rose-100 text-rose-800",
};

/** Status changes an admin may make by hand. PAID is never set here — only
 *  the payment module (verified callback or proof approval) sets it. */
export const ADMIN_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAYMENT_REVIEW: ["CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
};

/** Statuses in which stock is still reserved and can be put back. */
export const STOCK_HELD: OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_REVIEW", "PAID", "PROCESSING"];

/** Transitions only the Owner may perform. */
export function ownerOnlyTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (to === "REFUNDED") return true;
  if (to === "CANCELLED" && (from === "PAID" || from === "PROCESSING")) return true;
  return false;
}
