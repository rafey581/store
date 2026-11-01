import { describe, expect, it } from "vitest";
import { computePricing, type PricingCoupon } from "@/lib/pricing";

const base: PricingCoupon = { code: "X", type: "PERCENT", value: 1000, minSubtotalPaisa: 0, maxDiscountPaisa: null, startsAt: null, endsAt: null, usageLimit: null, perCustomerLimit: null, usedCount: 0, isActive: true };
const lines = [{ unitPricePaisa: 349900, quantity: 2 }, { unitPricePaisa: 199900, quantity: 1 }]; // 899700

describe("computePricing", () => {
  it("sums lines and adds shipping", () => {
    const r = computePricing({ lines, shipping: { feePaisa: 20000, freeAbovePaisa: null } });
    expect(r).toMatchObject({ subtotalPaisa: 899700, discountPaisa: 0, shippingPaisa: 20000, totalPaisa: 919700 });
  });
  it("applies free shipping threshold after discount", () => {
    const r = computePricing({ lines, coupon: { ...base, type: "FIXED", value: 400000 }, shipping: { feePaisa: 20000, freeAbovePaisa: 500000 } });
    expect(r.discountPaisa).toBe(400000);
    expect(r.shippingPaisa).toBe(20000); // 499700 < 500000
    const r2 = computePricing({ lines, shipping: { feePaisa: 20000, freeAbovePaisa: 500000 } });
    expect(r2.shippingPaisa).toBe(0);
    expect(r2.freeShipping).toBe(true);
  });
  it("percent coupon floors and respects cap", () => {
    expect(computePricing({ lines, coupon: base, shipping: null }).discountPaisa).toBe(89970);
    expect(computePricing({ lines, coupon: { ...base, maxDiscountPaisa: 50000 }, shipping: null }).discountPaisa).toBe(50000);
  });
  it("fixed discount never exceeds subtotal", () => {
    const r = computePricing({ lines: [{ unitPricePaisa: 1000, quantity: 1 }], coupon: { ...base, type: "FIXED", value: 999999 }, shipping: { feePaisa: 500, freeAbovePaisa: null } });
    expect(r.discountPaisa).toBe(1000);
    expect(r.totalPaisa).toBe(500);
  });
  it("free shipping coupon", () => {
    const r = computePricing({ lines, coupon: { ...base, type: "FREE_SHIPPING" }, shipping: { feePaisa: 20000, freeAbovePaisa: null } });
    expect(r.shippingPaisa).toBe(0);
    expect(r.discountPaisa).toBe(0);
  });
  it("rejects invalid coupons with a reason", () => {
    const now = new Date("2026-11-01T00:00:00Z");
    expect(computePricing({ lines, coupon: { ...base, isActive: false }, shipping: null, now }).couponError).toMatch(/not active/);
    expect(computePricing({ lines, coupon: { ...base, endsAt: new Date("2026-10-01") }, shipping: null, now }).couponError).toMatch(/expired/);
    expect(computePricing({ lines, coupon: { ...base, usageLimit: 5, usedCount: 5 }, shipping: null, now }).couponError).toMatch(/usage limit/);
    expect(computePricing({ lines, coupon: { ...base, perCustomerLimit: 1 }, customerCouponUses: 1, shipping: null, now }).couponError).toMatch(/already used/);
    const r = computePricing({ lines, coupon: { ...base, minSubtotalPaisa: 1000000 }, shipping: null, now });
    expect(r.couponError).toMatch(/Minimum order/);
    expect(r.discountPaisa).toBe(0);
  });
  it("rejects bad line data", () => {
    expect(() => computePricing({ lines: [{ unitPricePaisa: 10.5, quantity: 1 }], shipping: null })).toThrow();
    expect(() => computePricing({ lines: [{ unitPricePaisa: 100, quantity: 0 }], shipping: null })).toThrow();
  });
});
