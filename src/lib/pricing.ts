// Pure pricing logic. Used by the server at checkout (authoritative) and by
// tests. The browser never sends amounts; it only displays what this returns.

export type PricingLine = { unitPricePaisa: number; quantity: number };

export type PricingCoupon = {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number; // PERCENT: basis points, FIXED: paisa
  minSubtotalPaisa: number;
  maxDiscountPaisa: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  usedCount: number;
  isActive: boolean;
};

export type PricingShipping = {
  feePaisa: number;
  freeAbovePaisa: number | null;
};

export type PricingInput = {
  lines: PricingLine[];
  coupon?: PricingCoupon | null;
  customerCouponUses?: number; // redemptions by this email
  shipping: PricingShipping | null; // null = city not chosen yet
  codFeePaisa?: number; // cash-on-delivery charge, added to the total
  now?: Date;
};

export type PricingResult = {
  subtotalPaisa: number;
  discountPaisa: number;
  shippingPaisa: number;
  codFeePaisa: number;
  totalPaisa: number;
  couponApplied: string | null;
  couponError: string | null;
  freeShipping: boolean;
};

export function couponProblem(c: PricingCoupon, subtotalPaisa: number, customerUses: number, now: Date): string | null {
  if (!c.isActive) return "This coupon is not active.";
  if (c.startsAt && now < c.startsAt) return "This coupon is not active yet.";
  if (c.endsAt && now > c.endsAt) return "This coupon has expired.";
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return "This coupon has reached its usage limit.";
  if (c.perCustomerLimit !== null && customerUses >= c.perCustomerLimit) return "You have already used this coupon.";
  if (subtotalPaisa < c.minSubtotalPaisa) return `Minimum order for this coupon is Rs ${Math.ceil(c.minSubtotalPaisa / 100).toLocaleString("en-PK")}.`;
  return null;
}

export function computePricing(input: PricingInput): PricingResult {
  const now = input.now ?? new Date();
  let subtotal = 0;
  for (const l of input.lines) {
    if (!Number.isInteger(l.unitPricePaisa) || l.unitPricePaisa < 0) throw new Error("Invalid unit price");
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) throw new Error("Invalid quantity");
    subtotal += l.unitPricePaisa * l.quantity;
  }

  let discount = 0;
  let freeShippingByCoupon = false;
  let couponApplied: string | null = null;
  let couponError: string | null = null;

  if (input.coupon) {
    const c = input.coupon;
    const problem = couponProblem(c, subtotal, input.customerCouponUses ?? 0, now);
    if (problem) {
      couponError = problem;
    } else {
      couponApplied = c.code;
      if (c.type === "PERCENT") {
        discount = Math.floor((subtotal * c.value) / 10000);
        if (c.maxDiscountPaisa !== null) discount = Math.min(discount, c.maxDiscountPaisa);
      } else if (c.type === "FIXED") {
        discount = c.value;
      } else {
        freeShippingByCoupon = true;
      }
      discount = Math.max(0, Math.min(discount, subtotal));
    }
  }

  let shipping = 0;
  let freeShipping = false;
  if (input.shipping) {
    const afterDiscount = subtotal - discount;
    const threshold = input.shipping.freeAbovePaisa;
    if (freeShippingByCoupon || (threshold !== null && afterDiscount >= threshold)) {
      freeShipping = true;
    } else {
      shipping = input.shipping.feePaisa;
    }
  }

  const codFee = Math.max(0, input.codFeePaisa ?? 0);
  if (!Number.isInteger(codFee)) throw new Error("Invalid COD fee");
  return {
    subtotalPaisa: subtotal,
    discountPaisa: discount,
    shippingPaisa: shipping,
    codFeePaisa: codFee,
    totalPaisa: subtotal - discount + shipping + codFee,
    couponApplied,
    couponError,
    freeShipping,
  };
}
