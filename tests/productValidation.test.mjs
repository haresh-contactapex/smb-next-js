import test from "node:test";
import assert from "node:assert/strict";
import { validateProductPayload, describeProductErrors } from "@/lib/shared/product";
import { createProduct, updateProduct, ProductError } from "@/lib/products";

const validProduct = (overrides = {}) => ({
  title: "Gold Ring",
  handle: "gold-ring",
  status: "ACTIVE",
  pricing: { price: "49.99", compare_at_price: "", cost_per_item: "20" },
  inventory: { sku: "RING1", barcode: "" },
  shipping: { weight: "", weight_unit: "kg", hs_code: "" },
  seo: { title: "Gold Ring", description: "A ring." },
  variants: [],
  ...overrides,
});

const fieldsOf = (payload) => validateProductPayload(payload).map((e) => e.field);

test("a complete product passes", () => {
  assert.deepEqual(validateProductPayload(validProduct()), []);
});

test("rejects a payload that is not an object", () => {
  for (const bad of [null, undefined, "x", 5, []]) {
    assert.deepEqual(fieldsOf(bad), ["payload"], String(bad));
  }
});

test("title and handle are required and capped", () => {
  assert.ok(fieldsOf(validProduct({ title: "   " })).includes("title"));
  assert.ok(fieldsOf(validProduct({ title: 42 })).includes("title"));
  assert.ok(fieldsOf(validProduct({ title: "x".repeat(256) })).includes("title"));
  assert.ok(fieldsOf(validProduct({ handle: "" })).includes("handle"));
  assert.deepEqual(fieldsOf(validProduct({ title: "x".repeat(255) })), []);
});

test("status must be one of the stored values", () => {
  for (const bad of ["active", "PUBLISHED", "", undefined, null]) {
    assert.ok(fieldsOf(validProduct({ status: bad })).includes("status"), String(bad));
  }
  for (const good of ["ACTIVE", "DRAFT", "ARCHIVED"]) assert.deepEqual(fieldsOf(validProduct({ status: good })), []);
});

test("an ACTIVE product needs a price above zero, a DRAFT may be free or unpriced", () => {
  assert.ok(fieldsOf(validProduct({ pricing: { price: "0" } })).includes("price"));
  assert.ok(fieldsOf(validProduct({ pricing: { price: "" } })).includes("price"));
  assert.ok(fieldsOf(validProduct({ pricing: {} })).includes("price"));
  assert.deepEqual(fieldsOf(validProduct({ status: "DRAFT", pricing: { price: "0" } })), []);
  assert.deepEqual(fieldsOf(validProduct({ status: "DRAFT", pricing: {} })), []);
});

test("prices must be finite, non-negative and fit the column", () => {
  for (const bad of ["Infinity", "1e999", "NaN", "-5", "12abc", 1e10, true, {}, []]) {
    assert.ok(fieldsOf(validProduct({ pricing: { price: bad } })).includes("price"), String(bad));
  }
  assert.ok(fieldsOf(validProduct({ pricing: { price: "10", compare_at_price: "-1" } })).includes("compare_at_price"));
  assert.ok(fieldsOf(validProduct({ pricing: { price: "10", cost_per_item: "abc" } })).includes("cost_per_item"));
  assert.deepEqual(fieldsOf(validProduct({ pricing: { price: 49.99 } })), []);
});

test("shipping: weight is a bounded number and the unit is a known one", () => {
  assert.ok(fieldsOf(validProduct({ shipping: { weight: "-1", weight_unit: "kg" } })).includes("weight"));
  assert.ok(fieldsOf(validProduct({ shipping: { weight: "2", weight_unit: "stone" } })).includes("weight_unit"));
  assert.deepEqual(fieldsOf(validProduct({ shipping: { weight: 2, weight_unit: "lb" } })), []);
});

test("text fields respect their column widths", () => {
  assert.ok(fieldsOf(validProduct({ seo: { title: "x".repeat(71) } })).includes("seo_title"));
  assert.ok(fieldsOf(validProduct({ seo: { description: "x".repeat(161) } })).includes("seo_description"));
  assert.ok(fieldsOf(validProduct({ inventory: { sku: "x".repeat(101) } })).includes("sku"));
  assert.ok(fieldsOf(validProduct({ product_type: "x".repeat(101) })).includes("product_type"));
});

test("variants: price above zero on ACTIVE, whole quantities, sane weights", () => {
  const variant = (overrides = {}) => ({ sku: "V1", price: "10", inventory_quantity: 3, weight: "", weight_unit: "kg", ...overrides });
  assert.deepEqual(fieldsOf(validProduct({ variants: [variant()] })), []);
  assert.ok(fieldsOf(validProduct({ variants: [variant({ price: "0" })] })).includes("variants"));
  assert.ok(fieldsOf(validProduct({ variants: [variant({ price: "" })] })).includes("variants"));
  assert.deepEqual(fieldsOf(validProduct({ status: "DRAFT", variants: [variant({ price: "0" })] })), []);
  for (const bad of [1.5, -1, "1e999", "abc", 2147483648]) {
    assert.ok(fieldsOf(validProduct({ variants: [variant({ inventory_quantity: bad })] })).includes("variants"), String(bad));
  }
  assert.ok(fieldsOf(validProduct({ variants: [variant({ weight_unit: "stone" })] })).includes("variants"));
  assert.ok(fieldsOf(validProduct({ variants: "nope" })).includes("variants"));
  assert.ok(fieldsOf(validProduct({ variants: [null] })).includes("variants"));
});

test("messages name the offending variant", () => {
  const errors = validateProductPayload(validProduct({ variants: [{ price: "10" }, { price: "-2" }] }));
  assert.match(errors[0].message, /^Variant 2: price/);
});

test("describeProductErrors caps how many problems it prints", () => {
  const errors = Array.from({ length: 5 }, (_, i) => ({ field: "x", message: `Problem ${i + 1}.` }));
  assert.equal(describeProductErrors(errors, 2), "Problem 1. Problem 2. (and 3 more problems)");
  assert.equal(describeProductErrors(errors.slice(0, 1)), "Problem 1.");
});

test("createProduct and updateProduct refuse an invalid payload with a 422 before touching the database", async () => {
  // No database is configured in the unit test run, so reaching a query would throw a different error.
  for (const save of [() => createProduct({}), () => updateProduct("00000000-0000-0000-0000-000000000000", validProduct({ title: "" }))]) {
    await assert.rejects(save(), (error) => {
      assert.ok(error instanceof ProductError);
      assert.equal(error.status, 422);
      return true;
    });
  }
});
