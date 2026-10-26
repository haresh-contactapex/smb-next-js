import test from "node:test";
import assert from "node:assert/strict";
import { validateCouponPayload, normalizeCouponCode, isValidIsoDate } from "@/lib/shared/coupon";
import { createCoupon, updateCoupon, CouponError } from "@/lib/coupons";

const validCoupon = (overrides = {}) => ({
  code: "SAVE10",
  description: "",
  type: "percentage",
  value: "10",
  minPurchase: "",
  usageLimit: "",
  onePerCustomer: true,
  startDate: "",
  endDate: "",
  appliesTo: "ALL",
  categoryId: "",
  ...overrides,
});

const fieldsOf = (payload) => validateCouponPayload(payload).map((e) => e.field);
const CATEGORY_ID = "7b0c2a46-1d3e-4f5a-8b9c-0d1e2f3a4b5c";

test("a complete coupon passes", () => {
  assert.deepEqual(validateCouponPayload(validCoupon()), []);
  assert.deepEqual(validateCouponPayload(validCoupon({ type: "free_shipping", value: "" })), []);
  assert.deepEqual(
    validateCouponPayload(
      validCoupon({ minPurchase: "50", usageLimit: "100", startDate: "2026-01-01", endDate: "2026-12-31", appliesTo: "CATEGORY", categoryId: CATEGORY_ID })
    ),
    []
  );
});

test("rejects a payload that is not an object", () => {
  for (const bad of [null, undefined, "x", 3, []]) assert.deepEqual(fieldsOf(bad), ["payload"], String(bad));
});

test("normalizeCouponCode keeps upper-case letters and digits, max 20", () => {
  assert.equal(normalizeCouponCode(" save-10! "), "SAVE10");
  assert.equal(normalizeCouponCode("a".repeat(30)).length, 20);
  assert.equal(normalizeCouponCode(null), "");
});

test("the code must contain a letter or digit", () => {
  for (const bad of ["", "   ", "---", undefined]) assert.ok(fieldsOf(validCoupon({ code: bad })).includes("code"), String(bad));
});

test("type must be a known discount type", () => {
  for (const bad of ["PERCENTAGE", "bogo", "", undefined]) assert.ok(fieldsOf(validCoupon({ type: bad })).includes("type"), String(bad));
});

test("percentage: above 0 up to 100", () => {
  for (const bad of ["", "0", "-5", "100.01", "150", "abc", "Infinity", "1e999"]) {
    assert.ok(fieldsOf(validCoupon({ value: bad })).includes("value"), bad);
  }
  assert.deepEqual(fieldsOf(validCoupon({ value: "100" })), []);
  assert.deepEqual(fieldsOf(validCoupon({ value: 0.5 })), []);
});

test("fixed: above 0 and within the column, no percentage cap", () => {
  assert.deepEqual(fieldsOf(validCoupon({ type: "fixed", value: "250" })), []);
  for (const bad of ["", "0", "-1", 1e10]) assert.ok(fieldsOf(validCoupon({ type: "fixed", value: bad })).includes("value"), String(bad));
});

test("free shipping ignores whatever value is sent", () => {
  assert.deepEqual(fieldsOf(validCoupon({ type: "free_shipping", value: "garbage" })), []);
});

test("minimum purchase is optional but never negative or non-numeric", () => {
  for (const bad of ["-1", "abc", "Infinity"]) assert.ok(fieldsOf(validCoupon({ minPurchase: bad })).includes("minPurchase"), bad);
  assert.deepEqual(fieldsOf(validCoupon({ minPurchase: "0" })), []);
});

test("usage limit is optional but a whole number of at least 1", () => {
  for (const bad of ["0", "-3", "2.5", "abc", "2147483648"]) assert.ok(fieldsOf(validCoupon({ usageLimit: bad })).includes("usageLimit"), bad);
  assert.deepEqual(fieldsOf(validCoupon({ usageLimit: 1 })), []);
});

test("dates must be real calendar dates and the range must be ordered", () => {
  assert.equal(isValidIsoDate("2026-02-28"), true);
  assert.equal(isValidIsoDate("2026-02-31"), false);
  assert.equal(isValidIsoDate("26-02-01"), false);
  assert.ok(fieldsOf(validCoupon({ startDate: "tomorrow" })).includes("startDate"));
  assert.ok(fieldsOf(validCoupon({ endDate: "2026-13-01" })).includes("endDate"));
  const reversed = validateCouponPayload(validCoupon({ startDate: "2026-06-02", endDate: "2026-06-01" }));
  assert.deepEqual(reversed.map((e) => e.message), ["End date can't be before the start date."]);
  assert.deepEqual(fieldsOf(validCoupon({ startDate: "2026-06-01", endDate: "2026-06-01" })), []);
});

test("a category coupon needs a valid category id", () => {
  for (const bad of ["", undefined, "not-a-uuid"]) {
    assert.ok(fieldsOf(validCoupon({ appliesTo: "CATEGORY", categoryId: bad })).includes("categoryId"), String(bad));
  }
  assert.ok(fieldsOf(validCoupon({ appliesTo: "SOMETHING" })).includes("appliesTo"));
  assert.deepEqual(fieldsOf(validCoupon({ appliesTo: "ALL", categoryId: "" })), []);
});

test("onePerCustomer must be a boolean when sent", () => {
  assert.ok(fieldsOf(validCoupon({ onePerCustomer: "yes" })).includes("onePerCustomer"));
  const { onePerCustomer, ...withoutFlag } = validCoupon();
  assert.deepEqual(fieldsOf(withoutFlag), []);
});

test("createCoupon and updateCoupon refuse an invalid payload with a 422 before touching the database", async () => {
  // No database is configured in the unit test run, so reaching a query would throw a different error.
  const bad = validCoupon({ type: "percentage", value: "150" });
  for (const save of [() => createCoupon(bad), () => updateCoupon("00000000-0000-0000-0000-000000000000", bad)]) {
    await assert.rejects(save(), (error) => {
      assert.ok(error instanceof CouponError);
      assert.equal(error.status, 422);
      assert.match(error.message, /100/);
      return true;
    });
  }
});
