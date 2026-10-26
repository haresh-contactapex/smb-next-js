// Placing an order and settling its payment, against a real PostgreSQL: set TEST_DATABASE_URL to an
// empty, disposable database (CI starts one). Skipped when it is not set.
// Everything outside the database is replaced: pricing (it is covered by checkoutPricing.test.mjs),
// the Stripe API, the order emails and the store's settings. The SQL, the transactions, the coupon
// claim and the notification log run for real.
import test, { describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mockLib } from "./mock-helpers.mjs";

const url = process.env.TEST_DATABASE_URL;
const root = fileURLToPath(new URL("../", import.meta.url));

class CheckoutError extends Error {
  constructor(message, status = 400, { reason = null, details = null } = {}) {
    super(message);
    this.status = status;
    this.reason = reason;
    this.details = details;
  }
}

// What the fakes answer with and record; reset before every test.
let world;
const freshWorld = () => ({
  priced: null,
  pricedQueue: [], // when set, each priceCheckout() call takes the next one (for concurrent orders)
  payment: { codEnabled: true, codMinOrder: 0 },
  orders: { orderNumberPrefix: "SMB-", startingOrderNumber: 1000, defaultOrderStatus: "Pending" },
  guestCheckout: true,
  stripe: { configured: true, hasKeys: true, secretKey: "sk_test_x", captureAutomatically: true },
  createIntentError: null,
  intents: [],
  cancelledIntents: [],
  emails: [],
});

describe("checkout orders", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
  let db;
  let orders;

  before(async () => {
    process.env.DATABASE_URL = url;
    process.env.DATABASE_POOL_MAX = "1";
    execFileSync(process.execPath, ["scripts/migrate.mjs", "--all"], { cwd: root, env: { ...process.env, DATABASE_URL: url }, encoding: "utf8" });

    mockLib("checkoutPricing", {
      CheckoutError,
      countryCode: () => "US",
      priceCheckout: async () => structuredClone(world.pricedQueue.length ? world.pricedQueue.shift() : world.priced),
    });
    mockLib("ordersSettings", { getOrdersSettings: async () => world.orders });
    mockLib("paymentSettings", { getPaymentSettings: async () => world.payment });
    mockLib("checkoutSettings", { isGuestCheckoutAllowed: async () => world.guestCheckout });
    mockLib("moneyFormat", { loadMoneyFormat: async () => undefined });
    mockLib("orderEmails", {
      sendOrderConfirmation: async (orderId, options) => world.emails.push({ kind: "confirmation", orderId, ...options }),
      sendNewOrderAlert: async (orderId, options) => world.emails.push({ kind: "alert", orderId, ...options }),
      sendOrderStatusEmail: async (orderId, status) => world.emails.push({ kind: "status", orderId, status }),
    });
    mockLib("stripe", {
      loadStripeConfig: async () => world.stripe,
      createPaymentIntent: async (secretKey, params) => {
        if (world.createIntentError) throw world.createIntentError;
        const intent = { id: `pi_test_${world.intents.length + 1}_${Date.now()}`, client_secret: "secret", params };
        world.intents.push(intent);
        return intent;
      },
      cancelPaymentIntent: async (secretKey, id) => world.cancelledIntents.push(id),
      retrievePaymentIntent: async () => {
        throw new Error("not used here");
      },
    });

    db = await import("@/lib/db");
    orders = await import("@/lib/checkoutOrders");
  });

  beforeEach(async () => {
    world = freshWorld();
    await db.sql`TRUNCATE orders, order_addresses, customers, coupons, products, admin_notifications RESTART IDENTITY CASCADE`;
  });

  // ---------- helpers ----------
  let counter = 0;
  const next = () => (counter += 1);

  async function makeProduct() {
    const [row] = await db.sql`INSERT INTO products (title, handle, price, status) VALUES ('Gold Band', ${`gold-band-${next()}`}, 30, 'ACTIVE') RETURNING id`;
    return row.id;
  }

  async function makeCustomer(email = `member${next()}@shop.test`) {
    const [row] = await db.sql`
      INSERT INTO customers (first_name, last_name, email, is_guest) VALUES ('Mia', 'Member', ${email}, false) RETURNING id
    `;
    return { id: row.id, email };
  }

  async function makeCoupon({ code = "SAVE10", usageLimit = null, onePerCustomer = false } = {}) {
    const [row] = await db.sql`
      INSERT INTO coupons (code, discount_type, discount_value, usage_limit, one_per_customer, status)
      VALUES (${code}, 'percentage', 10, ${usageLimit}, ${onePerCustomer}, 'ACTIVE') RETURNING id
    `;
    return row.id;
  }

  // 2 x $30 = $60 + $12 shipping + $6 tax = $78, for a guest with a fresh email.
  async function priceFor({ email = `guest${next()}@shop.test`, productId, ...overrides } = {}) {
    const id = productId === undefined ? await makeProduct() : productId;
    const address = { country: "United States", line1: "1 Main St", line2: "", city: "New York", state: "New York", zip: "10001" };
    world.priced = {
      currency: "USD",
      contact: { firstName: "Jane", lastName: "Doe", email, phone: "(555) 123-4567", phoneE164: "+15551234567" },
      billing: address,
      shipping: address,
      sameAsBilling: true,
      lines: [{ productId: id, variantId: null, handle: "gold-band", title: "Gold Band", sku: "GB1", unitPrice: 30, quantity: 2, lineTotal: 60, engraving: null }],
      couponCode: null,
      note: "",
      subtotal: 60,
      discount: 0,
      shippingAmount: 12,
      shippingLabel: "Standard",
      tax: 6,
      total: 78,
      ...overrides,
    };
    return world.priced;
  }

  const count = async (table) => (await db.sqlQuery(`SELECT count(*)::int AS n FROM ${table}`, []))[0].n;
  const orderRow = async (id) => (await db.sql`SELECT * FROM orders WHERE id = ${id}`)[0];
  const notifications = async (action) => db.sql`SELECT * FROM admin_notifications WHERE action = ${action} ORDER BY id`;

  async function rejection(promise, { status, reason }) {
    let caught;
    try {
      await promise;
    } catch (error) {
      caught = error;
    }
    assert.ok(caught instanceof CheckoutError, `expected a CheckoutError, got ${caught}`);
    assert.equal(caught.status, status);
    assert.equal(caught.reason, reason);
    return caught;
  }

  // A pending card order, as startCardPayment leaves it. Returns what the webhook would be told about.
  async function cardOrder(overrides = {}) {
    await priceFor(overrides);
    const { orderNumber } = await orders.startCardPayment({}, null);
    const intent = world.intents.at(-1);
    const [row] = await db.sql`SELECT id FROM orders WHERE order_number = ${orderNumber}`;
    return {
      orderId: row.id,
      orderNumber,
      intent: (changes = {}) => ({
        id: intent.id,
        status: "succeeded",
        amount_received: 7800,
        currency: "usd",
        metadata: { order_id: row.id },
        payment_method: { type: "card", card: { brand: "visa", last4: "4242" } },
        ...changes,
      }),
    };
  }

  // ---------- placeCodOrder ----------
  describe("placeCodOrder", () => {
    test("saves a guest's order, its addresses, lines and a pending cod payment", async () => {
      const priced = await priceFor({ note: "Gift wrap please" });
      const { orderNumber, orderId } = await orders.placeCodOrder({}, null);

      assert.equal(orderNumber, "SMB-1000");
      const order = await orderRow(orderId);
      assert.equal(order.status, "Pending");
      assert.equal(order.payment_status, "Unpaid");
      assert.equal(Number(order.total_amount), 78);
      assert.equal(Number(order.tax_amount), 6);
      assert.equal(order.currency, "USD");
      assert.equal(order.item_count, 2);
      assert.equal(order.customer_note, "Gift wrap please");
      assert.notEqual(order.billing_address_id, order.shipping_address_id);

      const lines = await db.sql`SELECT title, quantity, unit_price, line_total FROM order_line_items WHERE order_id = ${orderId}`;
      assert.deepEqual(lines.map((l) => [l.title, l.quantity, Number(l.unit_price), Number(l.line_total)]), [["Gold Band", 2, 30, 60]]);

      const [payment] = await db.sql`SELECT provider, status, amount, provider_reference FROM payments WHERE order_id = ${orderId}`;
      assert.deepEqual([payment.provider, payment.status, Number(payment.amount), payment.provider_reference], ["cod", "pending", 78, null]);

      assert.equal(await count("order_addresses"), 2);
      const [guest] = await db.sql`SELECT email, is_guest FROM customers WHERE id = ${order.customer_id}`;
      assert.deepEqual([guest.email, guest.is_guest], [priced.contact.email, true]);

      assert.equal((await notifications("order.placed")).length, 1);
      assert.deepEqual(world.emails.map((e) => [e.kind, e.orderId, e.cod]), [["confirmation", orderId, true], ["alert", orderId, true]]);
    });

    test("order numbers count up from the highest one used", async () => {
      await priceFor();
      const first = await orders.placeCodOrder({}, null);
      await priceFor();
      const second = await orders.placeCodOrder({}, null);
      assert.deepEqual([first.orderNumber, second.orderNumber], ["SMB-1000", "SMB-1001"]);
    });

    test("orders placed at the same moment get different numbers", async () => {
      const productId = await makeProduct();
      for (let i = 0; i < 4; i += 1) world.pricedQueue.push(structuredClone(await priceFor({ productId })));
      const results = await Promise.all(Array.from({ length: 4 }, () => orders.placeCodOrder({}, null)));
      assert.equal(new Set(results.map((r) => r.orderNumber)).size, 4);
      assert.equal(await count("orders"), 4);
    });

    test("is refused when cash on delivery is off, with nothing written", async () => {
      await priceFor();
      world.payment.codEnabled = false;
      await rejection(orders.placeCodOrder({}, null), { status: 409, reason: "method_unavailable" });
      assert.deepEqual([await count("orders"), await count("customers")], [0, 0]);
    });

    test("is refused below the cash on delivery minimum", async () => {
      await priceFor();
      world.payment.codMinOrder = 100;
      const error = await rejection(orders.placeCodOrder({}, null), { status: 400, reason: "method_unavailable" });
      assert.match(error.message, /\$100\.00 or more/);
      assert.equal(await count("orders"), 0);
    });

    test("a guest needs guest checkout to be switched on; a signed-in customer does not", async () => {
      await priceFor();
      world.guestCheckout = false;
      await rejection(orders.placeCodOrder({}, null), { status: 403, reason: "sign_in_required" });
      assert.equal(await count("orders"), 0);

      const member = await makeCustomer();
      const { orderId } = await orders.placeCodOrder({}, member);
      assert.equal((await orderRow(orderId)).customer_id, member.id);
      assert.equal(await count("customers"), 1); // no guest row was added
    });

    test("a guest cannot use an email that already belongs to an account or an earlier guest", async () => {
      const member = await makeCustomer("taken@shop.test");
      await priceFor({ email: "Taken@Shop.test" });
      await rejection(orders.placeCodOrder({}, null), { status: 409, reason: "email_in_use" });

      await priceFor({ email: "once@shop.test" });
      await orders.placeCodOrder({}, null);
      await priceFor({ email: "ONCE@shop.test" });
      const error = await rejection(orders.placeCodOrder({}, null), { status: 409, reason: "email_in_use" });
      assert.match(error.message, /guest order/);
      assert.equal(await count("orders"), 1);
      assert.ok(member.id);
    });

    test("a coupon use is claimed with the order, and the last use goes to one order only", async () => {
      const couponId = await makeCoupon({ usageLimit: 1 });
      await priceFor({ couponCode: "SAVE10", discount: 6, total: 72 });
      const { orderId } = await orders.placeCodOrder({}, null);

      const [coupon] = await db.sql`SELECT usage_count FROM coupons WHERE id = ${couponId}`;
      assert.equal(coupon.usage_count, 1);
      const [redemption] = await db.sql`SELECT coupon_id, discount_amount FROM coupon_redemptions WHERE order_id = ${orderId}`;
      assert.deepEqual([redemption.coupon_id, Number(redemption.discount_amount)], [couponId, 6]);

      await priceFor({ couponCode: "SAVE10", discount: 6, total: 72 });
      const error = await rejection(orders.placeCodOrder({}, null), { status: 409, reason: "coupon_invalid" });
      assert.match(error.message, /usage limit/);
      assert.deepEqual(error.details, { couponCode: "SAVE10" });
      assert.equal(await count("orders"), 1);
      assert.equal((await db.sql`SELECT usage_count FROM coupons WHERE id = ${couponId}`)[0].usage_count, 1);
      assert.equal(await count("customers"), 1); // the second guest was rolled back with the order
    });

    test("a one-per-customer coupon cannot be used twice by the same customer", async () => {
      await makeCoupon({ code: "ONCE", onePerCustomer: true });
      const member = await makeCustomer();
      await priceFor({ couponCode: "ONCE", discount: 6, total: 72 });
      await orders.placeCodOrder({}, member);
      await priceFor({ couponCode: "ONCE", discount: 6, total: 72 });
      const error = await rejection(orders.placeCodOrder({}, member), { status: 409, reason: "coupon_invalid" });
      assert.match(error.message, /already used/);
      assert.equal(await count("orders"), 1);
    });

    test("a failure while saving leaves nothing behind and is reported as a 500", async () => {
      // A line whose product does not exist breaks the line-item insert after the order was written.
      await priceFor({ productId: "99999999-9999-4999-8999-999999999999" });
      const error = await rejection(orders.placeCodOrder({}, null), { status: 500, reason: "order_failed" });
      assert.match(error.message, /couldn't save your order/);
      assert.deepEqual([await count("orders"), await count("customers"), await count("order_addresses"), await count("payments")], [0, 0, 0, 0]);
      assert.equal((await notifications("order.placed")).length, 0);
      assert.equal(world.emails.length, 0);
    });

    test("an engraved line records what was asked for", async () => {
      await priceFor();
      world.priced.lines[0].engraving = { enabled: true, text: "Forever", fontId: "script", fontName: "Script" };
      const { orderId } = await orders.placeCodOrder({}, null);
      const [line] = await db.sql`SELECT engraving_enabled, engraving_text, engraving_font_name FROM order_line_items WHERE order_id = ${orderId}`;
      assert.deepEqual([line.engraving_enabled, line.engraving_text, line.engraving_font_name], [true, "Forever", "Script"]);
    });
  });

  // ---------- startCardPayment ----------
  describe("startCardPayment", () => {
    test("asks Stripe for the order's total and saves a pending Stripe payment tied to the intent", async () => {
      await priceFor();
      const result = await orders.startCardPayment({}, null);
      assert.equal(result.clientSecret, "secret");
      assert.deepEqual([result.amount, result.currency], [78, "USD"]);

      const intent = world.intents[0];
      assert.equal(intent.params.amount, 78);
      assert.equal(intent.params.captureAutomatically, true);
      assert.equal(intent.params.shipping.address.country, "US");

      const [row] = await db.sql`SELECT id, payment_status FROM orders WHERE order_number = ${result.orderNumber}`;
      assert.equal(row.payment_status, "Unpaid");
      assert.equal(intent.params.orderId, row.id);
      const [payment] = await db.sql`SELECT provider, status, provider_reference FROM payments WHERE order_id = ${row.id}`;
      assert.deepEqual([payment.provider, payment.status, payment.provider_reference], ["stripe", "pending", intent.id]);
      assert.equal(world.emails.length, 0); // announced only once it is paid
    });

    test("is refused, and Stripe never called, when card payments are not set up", async () => {
      await priceFor();
      world.stripe = { configured: false, hasKeys: false, problem: "off" };
      await rejection(orders.startCardPayment({}, null), { status: 503, reason: "gateway_unavailable" });
      assert.deepEqual([world.intents.length, await count("orders")], [0, 0]);
    });

    test("a Stripe failure saves no order", async () => {
      await priceFor();
      world.createIntentError = Object.assign(new Error("boom"), { code: "api_error" });
      await rejection(orders.startCardPayment({}, null), { status: 502, reason: "gateway_error" });
      assert.deepEqual([await count("orders"), await count("customers")], [0, 0]);
    });

    test("when the order cannot be saved the new intent is cancelled and the customer is not charged", async () => {
      await priceFor({ productId: "99999999-9999-4999-8999-999999999999" });
      const error = await rejection(orders.startCardPayment({}, null), { status: 500, reason: "order_failed" });
      assert.match(error.message, /not been charged/);
      assert.deepEqual(world.cancelledIntents, [world.intents[0].id]);
      assert.equal(await count("orders"), 0);
    });
  });

  // ---------- syncPaymentIntent ----------
  describe("syncPaymentIntent", () => {
    test("an intent that is not ours, or names no order, is not found", async () => {
      assert.deepEqual(await orders.syncPaymentIntent(null), { found: false, paid: false });
      assert.deepEqual(await orders.syncPaymentIntent({ id: "pi_1", metadata: {} }), { found: false, paid: false });
      assert.deepEqual(await orders.syncPaymentIntent({ id: "pi_1", metadata: { order_id: "not-a-uuid" } }), { found: false, paid: false });
      assert.deepEqual(await orders.syncPaymentIntent({ id: "pi_1", metadata: { order_id: "99999999-9999-4999-8999-999999999999" } }), { found: false, paid: false });
    });

    test("an order id paired with someone else's intent id is not found", async () => {
      const { intent } = await cardOrder();
      const other = await cardOrder();
      const mixed = intent({ id: other.intent().id });
      assert.deepEqual(await orders.syncPaymentIntent(mixed), { found: false, paid: false });
    });

    test("a succeeded payment for the full amount marks the order paid, once", async () => {
      const { orderId, orderNumber, intent } = await cardOrder();

      assert.deepEqual(await orders.syncPaymentIntent(intent()), { found: true, paid: true });
      assert.equal((await orderRow(orderId)).payment_status, "Paid");
      assert.equal((await db.sql`SELECT status FROM payments WHERE order_id = ${orderId}`)[0].status, "succeeded");

      const paid = await notifications("order.paid");
      assert.equal(paid.length, 1);
      assert.match(paid[0].title, new RegExp(`#${orderNumber} paid`));
      assert.equal(paid[0].severity, "success");
      const sent = world.emails.map((e) => [e.kind, e.paymentLabel]);
      assert.deepEqual(sent, [["confirmation", "Visa ending 4242"], ["alert", "Visa ending 4242"]]);

      // The webhook and the return page both call this, and Stripe retries: nothing repeats.
      assert.deepEqual(await orders.syncPaymentIntent(intent()), { found: true, paid: true });
      assert.deepEqual(await orders.syncPaymentIntent(intent()), { found: true, paid: true });
      assert.equal((await notifications("order.paid")).length, 1);
      assert.equal(world.emails.length, 2);
    });

    test("simultaneous deliveries of the same event settle the order once", async () => {
      const { orderId, intent } = await cardOrder();
      await Promise.all([orders.syncPaymentIntent(intent()), orders.syncPaymentIntent(intent()), orders.syncPaymentIntent(intent())]);
      assert.equal((await orderRow(orderId)).payment_status, "Paid");
      assert.equal((await notifications("order.paid")).length, 1);
      assert.equal(world.emails.filter((e) => e.kind === "confirmation").length, 1);
    });

    test("a payment for a different amount or currency is not accepted", async () => {
      const { orderId, intent } = await cardOrder();
      for (const wrong of [{ amount_received: 100 }, { amount_received: 7801 }, { currency: "eur" }, { amount_received: undefined }]) {
        assert.deepEqual(await orders.syncPaymentIntent(intent(wrong)), { found: true, paid: false });
      }
      assert.equal((await orderRow(orderId)).payment_status, "Unpaid");
      assert.equal((await db.sql`SELECT status FROM payments WHERE order_id = ${orderId}`)[0].status, "pending");
      assert.equal((await notifications("order.paid")).length, 0);
      assert.equal(world.emails.length, 0);
    });

    test("an intent still in progress changes nothing", async () => {
      const { orderId, intent } = await cardOrder();
      for (const status of ["requires_action", "processing", "requires_confirmation", "requires_capture"]) {
        assert.deepEqual(await orders.syncPaymentIntent(intent({ status })), { found: true, paid: false });
      }
      assert.equal((await orderRow(orderId)).payment_status, "Unpaid");
    });

    test("a declined payment marks the order Failed and emails the customer once", async () => {
      const { orderId, intent } = await cardOrder();
      const declined = intent({ status: "requires_payment_method", last_payment_error: { code: "card_declined" } });

      assert.deepEqual(await orders.syncPaymentIntent(declined), { found: true, paid: false });
      assert.equal((await orderRow(orderId)).payment_status, "Failed");
      assert.equal((await db.sql`SELECT status FROM payments WHERE order_id = ${orderId}`)[0].status, "failed");
      assert.deepEqual(world.emails.map((e) => [e.kind, e.status]), [["status", "failed"]]);

      await orders.syncPaymentIntent(declined);
      assert.equal(world.emails.length, 1);
    });

    test("requires_payment_method without an error (a fresh intent) leaves the order Unpaid", async () => {
      const { orderId, intent } = await cardOrder();
      await orders.syncPaymentIntent(intent({ status: "requires_payment_method", last_payment_error: null }));
      assert.equal((await orderRow(orderId)).payment_status, "Unpaid");
      assert.equal(world.emails.length, 0);
    });

    test("a failure event after the order was paid does not undo it", async () => {
      const { orderId, intent } = await cardOrder();
      await orders.syncPaymentIntent(intent());
      world.emails.length = 0;
      await orders.syncPaymentIntent(intent({ status: "requires_payment_method", last_payment_error: { code: "card_declined" } }));
      assert.equal((await orderRow(orderId)).payment_status, "Paid");
      assert.equal(world.emails.length, 0);
    });

    test("money arriving for an order that was cancelled is recorded as needing a refund, without customer emails", async () => {
      const { orderId, intent } = await cardOrder();
      await db.sql`UPDATE orders SET status = 'Cancelled' WHERE id = ${orderId}`;

      assert.deepEqual(await orders.syncPaymentIntent(intent()), { found: true, paid: true });
      assert.equal((await orderRow(orderId)).payment_status, "Paid");
      const [alert] = await notifications("order.paid");
      assert.equal(alert.severity, "warning");
      assert.match(alert.description, /needs a refund/);
      assert.equal(world.emails.length, 0);
    });

    test("an order that goes Paid, back to Unpaid and Paid again alerts the store only once", async () => {
      const { orderId, intent } = await cardOrder();
      await orders.syncPaymentIntent(intent());
      await db.sql`UPDATE orders SET payment_status = 'Unpaid' WHERE id = ${orderId}`;
      await db.sql`UPDATE payments SET status = 'pending' WHERE order_id = ${orderId}`;

      assert.deepEqual(await orders.syncPaymentIntent(intent()), { found: true, paid: true });
      assert.equal((await orderRow(orderId)).payment_status, "Paid");
      assert.equal((await notifications("order.paid")).length, 1);
    });
  });

  // ---------- resolveCodResult ----------
  describe("resolveCodResult", () => {
    test("only a cash on delivery order id opens its confirmation", async () => {
      await priceFor();
      const cod = await orders.placeCodOrder({}, null);
      const card = await cardOrder();

      const result = await orders.resolveCodResult(cod.orderId);
      assert.deepEqual([result.state, result.orderNumber, result.total, result.currency], ["cod", cod.orderNumber, 78, "USD"]);

      for (const id of [card.orderId, "99999999-9999-4999-8999-999999999999", "nope", undefined]) {
        assert.equal((await orders.resolveCodResult(id)).state, "unknown", String(id));
      }
    });
  });
});

