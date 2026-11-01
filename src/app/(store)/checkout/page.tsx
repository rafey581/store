import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { findCart } from "@/server/cart";
import { quoteCart, methodLabel } from "@/server/orders";
import { availableMethods } from "@/server/payments";
import { getCurrentUser } from "@/server/auth/session";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

const DESCRIPTIONS: Record<string, string> = {
  SAFEPAY: "Pay securely with Visa, Mastercard or UnionPay via Safepay.",
  PAYFAST: "Pay with debit/credit card or bank account via PayFast.",
  JAZZCASH: "Pay from your JazzCash mobile wallet.",
  EASYPAISA: "Pay from your Easypaisa mobile wallet.",
  MANUAL_TRANSFER: "Transfer to our bank account or wallet, then upload the receipt. Your order is confirmed after we verify it.",
};

export default async function CheckoutPage() {
  const cart = await findCart();
  if (!cart || cart.items.length === 0) redirect("/cart");
  const user = await getCurrentUser();
  const address = user ? await db.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) : null;
  const [cities, methods] = await Promise.all([db.shippingRate.findMany({ where: { isActive: true }, orderBy: { city: "asc" }, select: { city: true } }), availableMethods()]);
  const initial = {
    email: user?.email ?? "",
    customerName: address?.fullName ?? user?.name ?? "",
    phone: address?.phone ?? user?.phone ?? "",
    shipLine1: address?.line1 ?? "",
    shipLine2: address?.line2 ?? "",
    shipCity: address?.city ?? "",
    shipProvince: address?.province ?? "",
    shipPostalCode: address?.postalCode ?? "",
  };
  const q = await quoteCart(cart, { city: initial.shipCity, email: initial.email });
  if (q.blocked) redirect("/cart");
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>
      <CheckoutForm
        initial={initial}
        loggedIn={Boolean(user)}
        cities={cities.map((c) => c.city)}
        methods={methods.map((m) => ({ value: m, label: methodLabel(m), description: DESCRIPTIONS[m] }))}
        lines={q.lines.map((l) => ({ name: l.variantTitle !== "Default" ? `${l.productName} (${l.variantTitle})` : l.productName, qty: l.quantity, total: l.lineTotalPaisa }))}
        initialQuote={{ subtotalPaisa: q.subtotalPaisa, discountPaisa: q.discountPaisa, shippingPaisa: q.shippingPaisa, totalPaisa: q.totalPaisa, freeShipping: q.freeShipping, couponApplied: q.couponApplied, couponError: q.couponError, deliveryDays: q.deliveryDays, blocked: q.blocked }}
      />
    </div>
  );
}
