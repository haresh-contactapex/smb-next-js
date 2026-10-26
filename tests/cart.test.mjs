import test from "node:test";
import assert from "node:assert/strict";
import { cartTotals, couponEffect, clampQuantity, stockLeftForLine, round2 } from "@/lib/shared/cart";
import { checkoutTotals } from "@/lib/shared/checkout";

const item = (productId, price, quantity, extra = {}) => ({
  key: `${productId}:`, productId, variantId: null, price, quantity, maxQuantity: 0, ...extra,
});

test("round2 rounds half cents up without float drift", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(0.1 + 0.2), 0.3);
});

test("percentage coupon applies to eligible lines only", () => {
  const items = [item("a", 100, 1), item("b", 50, 2)];
  const effect = couponEffect({ type: "percentage", value: 10, eligibleProductIds: ["a"], minPurchase: 0 }, items);
  assert.equal(effect.applies, true);
  assert.equal(effect.amount, 10);
});

test("fixed coupon never takes off more than the eligible subtotal", () => {
  const effect = couponEffect({ type: "fixed", value: 500, eligibleProductIds: null, minPurchase: 0 }, [item("a", 40, 1)]);
  assert.equal(effect.amount, 40);
});

test("minimum purchase reports the shortfall and takes nothing off", () => {
  const effect = couponEffect({ type: "percentage", value: 20, eligibleProductIds: null, minPurchase: 100 }, [item("a", 60, 1)]);
  assert.deepEqual([effect.applies, effect.amount, effect.shortfall], [false, 0, 40]);
});

test("a category coupon with nothing eligible in the cart is flagged", () => {
  const effect = couponEffect({ type: "fixed", value: 5, eligibleProductIds: ["z"], minPurchase: 0 }, [item("a", 10, 1)]);
  assert.equal(effect.noEligibleItems, true);
});

test("cartTotals waives shipping over the threshold, measured after the discount", () => {
  const shipping = { carrier: "UPS", flatRate: 12, freeShippingThreshold: 100, localPickup: false, processingDays: 2, selectedRateId: "standard" };
  const under = cartTotals({ items: [item("a", 110, 1)], coupon: { type: "fixed", value: 20, eligibleProductIds: null, minPurchase: 0 }, shipping });
  assert.equal(under.discountedSubtotal, 90);
  assert.equal(under.shipping, 12);
  assert.equal(under.total, 102);
  const over = cartTotals({ items: [item("a", 110, 1)], coupon: null, shipping });
  assert.equal(over.shipping, 0);
  assert.equal(over.total, 110);
});

test("free-shipping coupon waives the rate", () => {
  const shipping = { carrier: "UPS", flatRate: 12, freeShippingThreshold: 1000, localPickup: false, processingDays: 0, selectedRateId: "standard" };
  const totals = cartTotals({ items: [item("a", 10, 1)], coupon: { type: "free_shipping", value: null, eligibleProductIds: null, minPurchase: 0 }, shipping });
  assert.equal(totals.shipping, 0);
});

test("quantities are clamped to stock and to 99", () => {
  assert.equal(clampQuantity(500, { maxQuantity: 0 }), 99);
  assert.equal(clampQuantity(5, { maxQuantity: 3 }), 3);
  assert.equal(clampQuantity(0, { maxQuantity: 3 }), 1);
});

test("lines of one variant share its stock", () => {
  const a = { key: "p:v:x", productId: "p", variantId: "v", quantity: 2, maxQuantity: 5 };
  const b = { key: "p:v:y", productId: "p", variantId: "v", quantity: 1, maxQuantity: 5 };
  assert.equal(stockLeftForLine([a, b], b), 3);
});

test("checkoutTotals adds tax unless prices include it", () => {
  const totals = { total: 110, discountedSubtotal: 100, shipping: 10 };
  assert.deepEqual(checkoutTotals(totals, { pricesIncludeTax: false, rate: 10, applyToShipping: false }), { tax: 10, taxIncluded: false, total: 120 });
  assert.equal(checkoutTotals(totals, { pricesIncludeTax: false, rate: 10, applyToShipping: true }).tax, 11);
  assert.deepEqual(checkoutTotals(totals, { pricesIncludeTax: true, rate: 10, applyToShipping: true }), { tax: null, taxIncluded: true, total: 110 });
  assert.equal(checkoutTotals(totals, null).total, 110);
});
