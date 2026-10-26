// priceCheckout() is what decides what a customer is charged: it prices every line from the
// database, re-checks the coupon and shipping, and refuses a total the customer was not shown.
// The data sources (database, settings, products, coupons) are replaced with in-memory fakes
// below; the pricing, cart arithmetic and address/contact validation run for real.
import test, { before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const lib = (name) => pathToFileURL(fileURLToPath(new URL(`../src/lib/${name}.js`, import.meta.url))).href;

const P1 = "11111111-1111-4111-8111-111111111111"; // simple product
const P2 = "22222222-2222-4222-8222-222222222222"; // product with variants
const V1 = "33333333-3333-4333-8333-333333333333";
const CATEGORY = "44444444-4444-4444-8444-444444444444";

// What the fakes answer with; reset before every test.
let db;
const freshDb = () => ({
  products: [
    { id: P1, title: "Gold Band", handle: "gold-band", sku: "GB1", price: 30, stock: null, variants: [] },
    {
      id: P2, title: "Silver Ring", handle: "silver-ring", sku: "", price: 100, stock: null,
      variants: [{ id: V1, sku: "SR7", price: 100, options: { Size: "7" }, maxQuantity: 3, available: true }],
    },
  ],
  coupon: null,
  categoryProductIds: [],
  tax: { pricesIncludeTax: false, rate: 10, applyToShipping: false },
  shipping: { defaultCarrier: "UPS", flatRateFee: "12", freeShippingThreshold: "100", localPickupEnabled: false, processingTimeDays: "2" },
});

let priceCheckout;
let CheckoutError;

before(async () => {
  const noDatabase = async () => {
    throw new Error("The pricing tests must not reach the database.");
  };
  mock.module(lib("db"), {
    exports: {
      // The only query pricing makes itself: which cart products sit in a coupon's category.
      sql: async () => db.categoryProductIds.map((id) => ({ id })),
      sqlQuery: noDatabase,
      sqlTransaction: noDatabase,
      withTransaction: noDatabase,
    },
  });
  mock.module(lib("products"), {
    exports: {
      listCheckoutProducts: async (ids) => db.products.filter((product) => ids.includes(product.id)),
      listStorefrontProductVariants: async () => [],
    },
  });
  mock.module(lib("coupons"), { exports: { getCouponByCode: async () => db.coupon } });
  mock.module(lib("shippingSettings"), { exports: { getShippingSettings: async () => db.shipping } });
  mock.module(lib("storefrontCheckout"), {
    exports: {
      loadCheckoutPricingSettings: async () => ({ currency: "USD", moneyFormat: undefined, tax: db.tax }),
    },
  });
  ({ priceCheckout, CheckoutError } = await import("@/lib/checkoutPricing"));
});

beforeEach(() => {
  db = freshDb();
});

const address = { country: "United States", line1: "1 Main St", line2: "", city: "New York", state: "New York", zip: "10001" };
const contact = { firstName: "Jane", lastName: "Doe", email: "jane@shop.com", phoneCountry: "US", phone: "(555) 123-4567" };

// 2 x $30 = $60, flat shipping $12, tax 10% of $60 = $6.
const order = (overrides = {}) => ({
  items: [{ productId: P1, variantId: null, quantity: 2, price: 30 }],
  contact,
  billing: address,
  sameAsBilling: true,
  expectedTotal: 78,
  ...overrides,
});

const activeCoupon = (overrides = {}) => ({
  code: "SAVE10", type: "percentage", value: 10, minPurchase: null, usageLimit: null, usageCount: 0,
  status: "ACTIVE", appliesTo: "ALL", categoryId: null, categoryName: "", ...overrides,
});

// The call rejects with a CheckoutError carrying these; returns the error for further checks.
async function rejection(input, { status, reason }) {
  let caught;
  try {
    await priceCheckout(input);
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof CheckoutError, `expected a CheckoutError, got ${caught}`);
  assert.equal(caught.status, status);
  if (reason !== undefined) assert.equal(caught.reason, reason);
  return caught;
}

test("prices the order from the database: subtotal, shipping, tax and total", async () => {
  const priced = await priceCheckout(order());
  assert.equal(priced.subtotal, 60);
  assert.equal(priced.discount, 0);
  assert.equal(priced.shippingAmount, 12);
  assert.equal(priced.tax, 6);
  assert.equal(priced.total, 78);
  assert.equal(priced.currency, "USD");
  assert.equal(priced.couponCode, null);
  assert.deepEqual(priced.lines.map((line) => [line.productId, line.unitPrice, line.quantity, line.lineTotal]), [[P1, 30, 2, 60]]);
  assert.equal(priced.billing.city, "New York");
  assert.equal(priced.shipping, priced.billing);
  assert.equal(priced.contact.phoneE164, "+15551234567");
});

test("free shipping applies at the threshold and prices-include-tax adds no tax", async () => {
  db.tax = { pricesIncludeTax: true, rate: 10, applyToShipping: false };
  db.products[0].price = 60;
  const priced = await priceCheckout(order({ items: [{ productId: P1, variantId: null, quantity: 2, price: 60 }], expectedTotal: 120 }));
  assert.equal(priced.shippingAmount, 0);
  assert.equal(priced.tax, null);
  assert.equal(priced.total, 120);
});

test("a variant's own price and options go on the line", async () => {
  const priced = await priceCheckout(order({ items: [{ productId: P2, variantId: V1, quantity: 1, price: 100 }], expectedTotal: 110 }));
  assert.equal(priced.lines[0].title, "Silver Ring (7)");
  assert.equal(priced.lines[0].sku, "SR7");
  assert.equal(priced.lines[0].variantId, V1);
  assert.equal(priced.total, 110);
});

test("the price the browser sends is never trusted: a lower one is refused with the real price", async () => {
  const error = await rejection(order({ items: [{ productId: P1, variantId: null, quantity: 2, price: 1 }], expectedTotal: 14 }), {
    status: 409,
    reason: "cart_changed",
  });
  assert.match(error.message, /price of Gold Band changed from \$1\.00 to \$30\.00/);
  assert.deepEqual(error.details.lines.map((line) => [line.found, line.price]), [[true, 30]]);
});

test("a stale expected total is refused and the current total is reported", async () => {
  const error = await rejection(order({ expectedTotal: 20 }), { status: 409, reason: "total_changed" });
  assert.equal(error.details.total, 78);
  for (const bad of [undefined, null, "abc", NaN, Infinity]) {
    await rejection(order({ expectedTotal: bad }), { status: 409, reason: "total_changed" });
  }
});

test("a product that is gone or inactive makes the cart fail as changed", async () => {
  db.products = [];
  const error = await rejection(order(), { status: 409, reason: "cart_changed" });
  assert.match(error.message, /no longer available/);
  assert.equal(error.details.lines[0].found, false);
});

test("a variant product cannot be bought without choosing a variant, nor a simple one with a variant id", async () => {
  await rejection(order({ items: [{ productId: P2, variantId: null, quantity: 1, price: 100 }] }), { status: 409, reason: "cart_changed" });
  await rejection(order({ items: [{ productId: P1, variantId: V1, quantity: 1, price: 30 }] }), { status: 409, reason: "cart_changed" });
});

test("stock: out of stock and more than is left are refused", async () => {
  db.products[0].stock = 0;
  assert.match((await rejection(order(), { status: 409, reason: "cart_changed" })).message, /out of stock/);

  db.products[0].stock = 1;
  assert.match((await rejection(order(), { status: 409, reason: "cart_changed" })).message, /Only 1 of Gold Band is in stock/);

  db.products[0].stock = 2;
  assert.equal((await priceCheckout(order())).total, 78);
});

test("two lines of one variant share its stock", async () => {
  // Same variant, different engraving => two lines; 2 + 2 wanted but only 3 left.
  const engraving = (text) => ({ text, fontId: null });
  const items = [
    { productId: P2, variantId: V1, quantity: 2, price: 100 },
    { productId: P2, variantId: V1, quantity: 2, price: 100, engraving: engraving("A") },
  ];
  const error = await rejection(order({ items, expectedTotal: 0 }), { status: 409, reason: "cart_changed" });
  assert.match(error.message, /Only 3 of Silver Ring are in stock/);
});

test("cart shape: empty, too many lines, bad ids, quantities, prices and duplicates", async () => {
  const line = (overrides) => ({ productId: P1, variantId: null, quantity: 1, price: 30, ...overrides });
  const bad = (items, pattern) => rejection(order({ items }), { status: 400 }).then((error) => assert.match(error.message, pattern));

  for (const items of [undefined, null, "x", []]) await bad(items, /cart is empty/);
  await bad(Array.from({ length: 51 }, (_, i) => line({ variantId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}` })), /too many items/);
  await bad([line({ productId: "nope" })], /isn't valid/);
  await bad([line({ productId: undefined })], /isn't valid/);
  await bad([line({ variantId: "nope" })], /isn't valid/);
  await bad([null], /isn't valid/);
  for (const quantity of [0, -1, 1.5, 100, "abc", undefined]) await bad([line({ quantity })], /invalid quantity/);
  for (const price of [-1, "abc", NaN, Infinity, undefined]) await bad([line({ price })], /invalid price/);
  await bad([line({}), line({})], /twice/);
  await bad([line({ engraving: "text" })], /isn't valid/);
  await bad([line({ engraving: ["a"] })], /isn't valid/);
});

test("contact and address problems name the field at fault", async () => {
  const badContact = await rejection(order({ contact: { ...contact, email: "nope" } }), { status: 400, reason: "invalid_contact" });
  assert.equal(badContact.details.field, "email");

  const noStreet = await rejection(order({ billing: { ...address, line1: "" } }), { status: 400, reason: "invalid_address" });
  assert.deepEqual(noStreet.details, { section: "billing", field: "line1" });
  assert.match(noStreet.message, /billing address/);

  // A real city with a ZIP that belongs somewhere else.
  const wrongZip = await rejection(order({ billing: { ...address, zip: "90210" } }), { status: 400, reason: "invalid_address" });
  assert.equal(wrongZip.details.section, "billing");
});

test("a separate shipping address is validated and used for shipping", async () => {
  const shippingTo = { ...address, line1: "9 Side St" };
  const priced = await priceCheckout(order({ sameAsBilling: false, shipping: shippingTo }));
  assert.equal(priced.shipping.line1, "9 Side St");
  assert.notEqual(priced.shipping, priced.billing);

  const bad = await rejection(order({ sameAsBilling: false, shipping: { ...shippingTo, city: "" } }), { status: 400, reason: "invalid_address" });
  assert.equal(bad.details.section, "shipping");
  await rejection(order({ sameAsBilling: false, shipping: undefined }), { status: 400, reason: "invalid_address" });
});

test("a valid coupon is re-checked and lowers the total", async () => {
  db.coupon = activeCoupon();
  const priced = await priceCheckout(order({ couponCode: "save-10", expectedTotal: 71.4 }));
  assert.equal(priced.couponCode, "SAVE10");
  assert.equal(priced.discount, 6);
  assert.equal(priced.tax, 5.4);
  assert.equal(priced.total, 71.4);
});

test("a coupon that cannot be used fails the order instead of changing the total", async () => {
  for (const coupon of [
    null,
    activeCoupon({ status: "EXPIRED" }),
    activeCoupon({ status: "SCHEDULED" }),
    activeCoupon({ usageLimit: 5, usageCount: 5 }),
  ]) {
    db.coupon = coupon;
    const error = await rejection(order({ couponCode: "SAVE10", expectedTotal: 71.4 }), { status: 409, reason: "coupon_invalid" });
    assert.deepEqual(error.details, { couponCode: "SAVE10" });
    assert.match(error.message, /discount code was removed/);
  }
});

test("a category coupon only discounts when the cart holds a product from that category", async () => {
  db.coupon = activeCoupon({ appliesTo: "CATEGORY", categoryId: CATEGORY, categoryName: "Rings" });
  db.categoryProductIds = [];
  const error = await rejection(order({ couponCode: "SAVE10" }), { status: 409, reason: "coupon_invalid" });
  assert.match(error.message, /only applies to Rings items/);

  db.categoryProductIds = [P1];
  assert.equal((await priceCheckout(order({ couponCode: "SAVE10", expectedTotal: 71.4 }))).discount, 6);
});

test("a coupon whose minimum purchase is not met takes nothing off and is not recorded", async () => {
  db.coupon = activeCoupon({ minPurchase: 500 });
  const priced = await priceCheckout(order({ couponCode: "SAVE10" }));
  assert.equal(priced.discount, 0);
  assert.equal(priced.couponCode, null);
  assert.equal(priced.total, 78);
});

test("an unknown shipping option is refused", async () => {
  await rejection(order({ shippingRateId: "teleport" }), { status: 400, reason: "invalid_shipping" });
});

test("the order note is plain text without control characters", async () => {
  const priced = await priceCheckout(order({ note: " Gift\u0000 wrap\r\nplease\u0007 " }));
  assert.equal(priced.note, "Gift wrap\nplease");
  assert.equal((await priceCheckout(order({ note: { not: "text" } }))).note, "");
});
