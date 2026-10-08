import { randomUUID, timingSafeEqual } from "crypto";
import { sql, sqlTransaction } from "./db";
import { findCustomerEmailOwner } from "./customers";
import { getOrdersSettings } from "./ordersSettings";
import { isGuestCheckoutAllowed } from "./checkoutSettings";
import { getPaymentSettings } from "./paymentSettings";
import { logAdminActivity } from "./notifications";
import { formatCurrency, toMinorUnits } from "./currency";
import { loadMoneyFormat } from "./moneyFormat";
import { getOrderConfirmation } from "./orders";
import { CheckoutError, countryCode, priceCheckout } from "./checkoutPricing";
import { cancelPaymentIntent, createPaymentIntent, loadStripeConfig, retrievePaymentIntent } from "./stripe";
import { sendNewOrderAlert, sendOrderConfirmation, sendOrderStatusEmail } from "./orderEmails";

// Placing an order and recording what Stripe says about its payment.
//
// A card order is written in one go when the customer presses Place Order: the
// server prices the cart itself (checkoutPricing.js), asks Stripe for a
// PaymentIntent for exactly that total, then saves the order as Pending / Unpaid
// with its addresses, line items and a pending `payments` row holding the intent id.
// The order only becomes Paid when Stripe confirms the money, through the signed
// webhook or the return page; the browser saying "it worked" is never enough.

const MAX_ORDER_NUMBER_ATTEMPTS = 3;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isOrderNumberCollision(error) {
  return error?.code === "23505" && /order_number/.test(`${error.constraint || ""} ${error.message || ""}`);
}

function isCustomerEmailCollision(error) {
  return error?.code === "23505" && /customers_email/.test(`${error.constraint || ""} ${error.message || ""}`);
}

// Neon reports a missing table as 42P01; the detail tables come from the order-details migration.
function isMissingTable(error) {
  return error?.code === "42P01";
}

// The next order number: the store's prefix and the next free number after the
// highest one used so far (never below the configured starting number).
async function insertOrder({ orderId, priced, customer, provider = "stripe", intentId = null }) {
  const settings = await getOrdersSettings();
  const prefix = settings.orderNumberPrefix || "";
  const startingNumber = Number(settings.startingOrderNumber) || 10000;
  const status = settings.defaultOrderStatus || "Pending";

  const { contact, billing, shipping, lines } = priced;
  const fullName = `${contact.firstName} ${contact.lastName}`;
  const phone = contact.phoneE164;
  const billingId = randomUUID();
  const shippingId = randomUUID();
  const guestEmail = String(contact.email || "").trim().toLowerCase();
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  // The email was checked before pricing (assertGuestEmailFree); only a checkout that raced
  // another one for the same new email can still collide, and the unique index catches that.
  const guestId = customer ? null : randomUUID();

  for (let attempt = 1; attempt <= MAX_ORDER_NUMBER_ATTEMPTS; attempt += 1) {
    try {
      let orderIndex = 0;
      const results = await sqlTransaction((tx) => {
        const statements = [];
        if (guestId) {
          statements.push(tx`
            INSERT INTO customers (id, first_name, last_name, email, phone, is_guest)
            VALUES (${guestId}, ${contact.firstName}, ${contact.lastName}, ${guestEmail}, ${phone}, true)
          `);
        }
        for (const [id, type, address] of [[billingId, "BILLING", billing], [shippingId, "SHIPPING", shipping]]) {
          statements.push(tx`
            INSERT INTO order_addresses (id, type, full_name, address_line1, address_line2, city, state, postal_code, country, phone)
            VALUES (${id}, ${type}, ${fullName}, ${address.line1}, ${address.line2 || null}, ${address.city}, ${address.state},
                    ${address.zip || null}, ${address.country}, ${phone})
          `);
        }

        orderIndex = statements.length;
        statements.push(tx`
          INSERT INTO orders (
            id, order_number, customer_id, customer_name, billing_address_id, shipping_address_id, item_count,
            total_amount, currency, status, payment_status, subtotal_amount, discount_amount, shipping_amount, tax_amount, coupon_code
          )
          VALUES (
            ${orderId},
            (SELECT ${prefix}::text || GREATEST(${startingNumber}::bigint, COALESCE(MAX(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::bigint), 0) + 1)::text FROM orders),
            ${customer?.id || guestId}, ${fullName}, ${billingId}, ${shippingId}, ${itemCount},
            ${priced.total}, ${priced.currency}, ${status}, 'Unpaid', ${priced.subtotal}, ${priced.discount}, ${priced.shippingAmount}, ${priced.tax}, ${priced.couponCode}
          )
          RETURNING order_number
        `);
        for (const line of lines) {
          // A line the customer engraved also records what they asked for (already checked and
          // cleaned by checkoutPricing.js; the font name is the store's own, not the request's).
          // A plain line keeps the original insert, which still works before the engraving
          // migration has been run.
          statements.push(
            line.engraving
              ? tx`
                  INSERT INTO order_line_items (
                    order_id, product_id, variant_id, title, sku, unit_price, quantity, line_total,
                    engraving_enabled, engraving_text, engraving_font_id, engraving_font_name
                  )
                  VALUES (
                    ${orderId}, ${line.productId}, ${line.variantId}, ${line.title.slice(0, 255)}, ${line.sku || null}, ${line.unitPrice}, ${line.quantity}, ${line.lineTotal},
                    true, ${line.engraving.text}, ${line.engraving.fontId}, ${line.engraving.fontName}
                  )
                `
              : tx`
                  INSERT INTO order_line_items (order_id, product_id, variant_id, title, sku, unit_price, quantity, line_total)
                  VALUES (${orderId}, ${line.productId}, ${line.variantId}, ${line.title.slice(0, 255)}, ${line.sku || null}, ${line.unitPrice}, ${line.quantity}, ${line.lineTotal})
                `
          );
        }
        statements.push(tx`
          INSERT INTO payments (order_id, provider, status, amount, provider_reference)
          VALUES (${orderId}, ${provider}, 'pending', ${priced.total}, ${intentId})
        `);
        return statements;
      });
      return results[orderIndex][0].order_number;
    } catch (error) {
      // Two checkouts picked the same number at once: nothing was written, so try again.
      if (isOrderNumberCollision(error) && attempt < MAX_ORDER_NUMBER_ATTEMPTS) continue;
      // Another guest checkout took this email a moment ago: nothing was written.
      if (isCustomerEmailCollision(error)) throw emailInUseError({ isGuest: true });
      if (isMissingTable(error)) console.error("Order tables are missing. Run `npm run db:migrate:order-details`.", error.message);
      throw error;
    }
  }
  throw new Error("Could not generate a unique order number.");
}

// The checkout page already asks for an account when guest checkout is off; this is the
// real gate, since the API is public (Settings -> Checkout -> Allow guest checkout).
async function assertMayCheckout(customer) {
  if (!customer && !(await isGuestCheckoutAllowed())) {
    throw new CheckoutError("Please sign in or create an account to place your order.", 403, { reason: "sign_in_required" });
  }
}

function emailInUseError({ isGuest }) {
  return new CheckoutError(
    isGuest
      ? "This email was already used for a guest order. Please create an account with it, or use a different email address, to place your order."
      : "An account already exists for this email. Please sign in to place your order.",
    409,
    { reason: "email_in_use" }
  );
}

// A guest can't check out with an email that is already on file: a registered account's owner
// must sign in (otherwise anyone could place orders on, and see mail about, someone else's
// account), and an email a previous guest used belongs to that guest's record. The API is
// public, so this is the real gate. A signed-in customer isn't a guest, so it never applies.
async function assertGuestEmailFree(customer, email) {
  if (customer) return;
  const owner = await findCustomerEmailOwner(email);
  if (owner) throw emailInUseError(owner);
}

// Places a cash-on-delivery order: nothing is paid online, so there is no gateway to ask.
// The order is saved as Pending / Unpaid with a pending `cod` payment row; staff mark it
// Paid once the cash is collected. Prices the cart itself, like a card order does, and
// refuses when cash on delivery is switched off or the total is below its minimum.
// Returns { orderNumber, orderId } (the id is what the confirmation page is opened with).
export async function placeCodOrder(input, customer) {
  await assertMayCheckout(customer);

  const payment = await getPaymentSettings();
  if (!payment.codEnabled) {
    throw new CheckoutError("Cash on delivery isn't available right now.", 409, { reason: "method_unavailable" });
  }

  const priced = await priceCheckout(input);
  await assertGuestEmailFree(customer, priced.contact.email);
  const minimum = Number(payment.codMinOrder) || 0;
  if (minimum > 0 && priced.total < minimum) {
    const moneyFormat = await loadMoneyFormat();
    throw new CheckoutError(
      `Cash on delivery is available on orders of ${formatCurrency(minimum, priced.currency, moneyFormat)} or more.`,
      400,
      { reason: "method_unavailable" }
    );
  }

  const orderId = randomUUID();
  let orderNumber;
  try {
    orderNumber = await insertOrder({ orderId, priced, customer, provider: "cod" });
  } catch (error) {
    if (error instanceof CheckoutError) throw error;
    console.error("The cash on delivery order could not be saved", error.code || "", error.message);
    const details = process.env.NODE_ENV === "development" ? { cause: error.message } : null;
    throw new CheckoutError("We couldn't save your order. Please try again.", 500, { reason: "order_failed", details });
  }

  // Nothing else tells the store about this order (a card order is announced once it is paid).
  const moneyFormat = await loadMoneyFormat();
  await logAdminActivity({
    action: "order.placed",
    entityType: "order",
    entityId: orderId,
    title: `New cash on delivery order #${orderNumber}`,
    description: `${priced.contact.firstName} ${priced.contact.lastName} placed an order for ${formatCurrency(priced.total, priced.currency, moneyFormat)} to pay on delivery.`,
    severity: "info",
  });
  await sendOrderConfirmation(orderId, { cod: true, paymentLabel: "Cash on delivery" });
  await sendNewOrderAlert(orderId, { cod: true, paymentLabel: "Cash on delivery" });
  return { orderNumber, orderId };
}

// Prices the cart, asks Stripe for a PaymentIntent for that total and saves the
// order. Returns what the browser needs to confirm the payment. `customer` is the
// signed-in customer, or null for a guest checkout.
export async function startCardPayment(input, customer) {
  await assertMayCheckout(customer);

  const stripe = await loadStripeConfig();
  if (!stripe.configured) {
    console.error(`Card checkout refused: ${stripe.problem}`);
    throw new CheckoutError("Card payments aren't available right now.", 503, { reason: "gateway_unavailable" });
  }

  const priced = await priceCheckout(input);
  await assertGuestEmailFree(customer, priced.contact.email);
  const orderId = randomUUID();

  const shippingCountry = countryCode(priced.shipping.country);
  let intent;
  try {
    intent = await createPaymentIntent(stripe.secretKey, {
      orderId,
      amount: priced.total,
      currency: priced.currency,
      receiptEmail: priced.contact.email,
      description: "shopmyband.com order",
      captureAutomatically: stripe.captureAutomatically,
      shipping: shippingCountry
        ? {
            name: `${priced.contact.firstName} ${priced.contact.lastName}`,
            address: {
              line1: priced.shipping.line1,
              line2: priced.shipping.line2,
              city: priced.shipping.city,
              state: priced.shipping.state,
              postal_code: priced.shipping.zip,
              country: shippingCountry,
            },
          }
        : undefined,
    });
  } catch (error) {
    console.error("Stripe could not create a PaymentIntent", error.code || error.type || "", error.message);
    throw new CheckoutError("We couldn't start your payment. Please try again in a moment.", 502, { reason: "gateway_error" });
  }

  try {
    const orderNumber = await insertOrder({ orderId, priced, customer, intentId: intent.id });
    return { orderNumber, clientSecret: intent.client_secret, amount: priced.total, currency: priced.currency };
  } catch (error) {
    // Nothing was charged; don't leave an intent hanging for an order that doesn't exist.
    await cancelPaymentIntent(stripe.secretKey, intent.id).catch(() => {});
    if (error instanceof CheckoutError) throw error;
    console.error("The order could not be saved", error.code || "", error.message);
    // In development the database's own message comes back too, so a missing migration is obvious.
    const details = process.env.NODE_ENV === "development" ? { cause: error.message } : null;
    throw new CheckoutError("We couldn't save your order. You have not been charged. Please try again.", 500, { reason: "order_failed", details });
  }
}

// Whether the store has already been told this order was paid. The admin gets one "order
// paid" notification per order, however many times the order moves into Paid: it can
// leave Paid and come back (a staff edit while testing, a status reset) and a re-sync
// then moves it again, which should not alert the team a second time. The payments
// table still records every payment. If the lookup fails the answer is "no", so a
// notifications hiccup can never get in the way of settling a payment.
async function paidAlertAlreadySent(orderId) {
  try {
    const [row] = await sql`
      SELECT 1 AS sent FROM admin_notifications
      WHERE action = 'order.paid' AND entity_type = 'order' AND entity_id = ${String(orderId)}
      LIMIT 1
    `;
    return Boolean(row);
  } catch (error) {
    console.error("Could not check for an earlier order.paid notification", error.message);
    return false;
  }
}

// Brings an order in line with what Stripe says about its PaymentIntent. Safe to call
// any number of times, from the webhook and the return page alike: the order is only
// flipped to Paid once, and only when Stripe reports the full amount in the order's
// currency. Returns { found, paid }.
export async function syncPaymentIntent(intent) {
  const orderId = intent?.metadata?.order_id;
  if (!intent?.id || !UUID_PATTERN.test(String(orderId || ""))) return { found: false, paid: false };

  const [order] = await sql`
    SELECT o.id, o.order_number, o.status, o.payment_status, o.total_amount, o.currency, o.customer_name
    FROM orders o
    JOIN payments p ON p.order_id = o.id AND p.provider = 'stripe' AND p.provider_reference = ${intent.id}
    WHERE o.id = ${orderId}
  `;
  if (!order) return { found: false, paid: false };

  if (intent.status === "succeeded") {
    const expected = toMinorUnits(order.total_amount, order.currency);
    if (intent.amount_received !== expected || String(intent.currency).toLowerCase() !== String(order.currency).toLowerCase()) {
      console.error(`Stripe payment ${intent.id} does not match order ${order.order_number}: got ${intent.amount_received} ${intent.currency}, expected ${expected} ${order.currency}.`);
      return { found: true, paid: false };
    }

    const [justPaid] = await sql`
      UPDATE orders SET payment_status = 'Paid', updated_at = now()
      WHERE id = ${order.id} AND payment_status <> 'Paid'
      RETURNING id
    `;
    await sql`UPDATE payments SET status = 'succeeded' WHERE order_id = ${order.id} AND provider_reference = ${intent.id} AND status <> 'succeeded'`;

    // Only the call that actually moved the order into Paid gets here (the update above is atomic),
    // and it still stays quiet if the store was already told about this order.
    if (justPaid && !(await paidAlertAlreadySent(order.id))) {
      const cancelled = order.status === "Cancelled";
      const moneyFormat = await loadMoneyFormat();
      await logAdminActivity({
        action: "order.paid",
        entityType: "order",
        entityId: order.id,
        title: `Order #${order.order_number} paid`,
        description: cancelled
          ? `${order.customer_name} paid ${formatCurrency(order.total_amount, order.currency, moneyFormat)} by card, but the order had already been cancelled. It needs a refund.`
          : `${order.customer_name} paid ${formatCurrency(order.total_amount, order.currency, moneyFormat)} by card.`,
        severity: cancelled ? "warning" : "success",
        metadata: { to: { paymentStatus: "Paid" } },
      });
    }
    // Only the call that moved the order into Paid gets here, so the customer and the store are
    // emailed once (and not for an order that was cancelled before the money arrived).
    if (justPaid && order.status !== "Cancelled") {
      const paymentLabel = describePaymentMethod(intent.payment_method) || "Card";
      await sendOrderConfirmation(order.id, { cod: false, paymentLabel });
      await sendNewOrderAlert(order.id, { cod: false, paymentLabel });
    }
    return { found: true, paid: true };
  }

  if (intent.status === "requires_payment_method" && intent.last_payment_error) {
    // Only the call that moves the order from Unpaid to Failed emails the customer, once.
    const [justFailed] = await sql`UPDATE orders SET payment_status = 'Failed', updated_at = now() WHERE id = ${order.id} AND payment_status = 'Unpaid' RETURNING id`;
    await sql`UPDATE payments SET status = 'failed' WHERE order_id = ${order.id} AND provider_reference = ${intent.id} AND status = 'pending'`;
    if (justFailed && order.status !== "Cancelled") await sendOrderStatusEmail(order.id, "failed");
  }
  return { found: true, paid: false };
}

const sameSecret = (given, actual) => {
  const a = Buffer.from(String(given || ""));
  const b = Buffer.from(String(actual || ""));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
};

const CARD_BRANDS = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

// How the customer paid, in a few words, from the PaymentIntent's expanded payment
// method: "Visa ending 4242" for a card (Apple Pay and Google Pay arrive as cards too),
// otherwise the method's type ("Link", "Klarna"). Null when Stripe didn't say.
function describePaymentMethod(method) {
  if (!method || typeof method !== "object") return null;
  if (method.card?.last4) return `${CARD_BRANDS[method.card.brand] || "Card"} ending ${method.card.last4}`;
  const type = String(method.type || "").replace(/_/g, " ");
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : null;
}

// Outcomes where the order is placed and money is taken or on its way: the ones the
// confirmation page shows in full. The others (a declined card, an unfinished 3-D Secure
// step) only name the order, since the customer is sent back to try again.
const PLACED_STATES = new Set(["paid", "authorized", "processing"]);

// The confirmation page of a cash-on-delivery order. It is opened with the order's id,
// which only the browser that placed the order was given (a random UUID, so it works as
// the proof that this visitor placed it, like the client secret does for a card order).
// Only an order whose payment is cash on delivery qualifies. state: "cod" | "unknown".
export async function resolveCodResult(orderId) {
  const unknown = { state: "unknown", orderNumber: null, total: 0, currency: null, details: null };
  if (!UUID_PATTERN.test(String(orderId || ""))) return unknown;

  const [order] = await sql`
    SELECT o.order_number, o.total_amount, o.currency
    FROM orders o
    JOIN payments p ON p.order_id = o.id AND p.provider = 'cod'
    WHERE o.id = ${orderId}
    LIMIT 1
  `;
  if (!order) return unknown;

  let details = null;
  try {
    const confirmation = await getOrderConfirmation(orderId);
    if (confirmation) details = { ...confirmation, paymentMethod: "Cash on delivery" };
  } catch (error) {
    console.error("Could not load the order details for the confirmation page", error.message);
  }

  return { state: "cod", orderNumber: order.order_number, total: Number(order.total_amount) || 0, currency: order.currency, details };
}

// What the order-confirmation page shows. It is reached with the PaymentIntent's id
// and client secret (Stripe appends both to the return URL), and the secret has to
// match: that is what proves this visitor made the payment. Never trusts the URL for
// the outcome; asks Stripe, and syncs the order while it is at it. For a placed order
// the result also carries `details`: its items, addresses, price breakdown and how it
// was paid (null if they couldn't be loaded, so the page still has the number and total).
// state: paid | authorized | processing | action | failed | unknown
export async function resolveCheckoutResult({ paymentIntentId, clientSecret }) {
  const unknown = { state: "unknown", orderNumber: null, total: 0, currency: null, details: null };
  if (!/^pi_[A-Za-z0-9_]+$/.test(String(paymentIntentId || "")) || !clientSecret) return unknown;

  // The keys are enough to settle a payment already made, even if Stripe has been switched off since.
  const stripe = await loadStripeConfig();
  if (!stripe.hasKeys) return unknown;

  let intent;
  try {
    intent = await retrievePaymentIntent(stripe.secretKey, paymentIntentId, { expand: ["payment_method"] });
  } catch (error) {
    console.error("Could not read the PaymentIntent for the confirmation page", error.code || "", error.message);
    return unknown;
  }
  if (!sameSecret(clientSecret, intent.client_secret)) return unknown;

  await syncPaymentIntent(intent);

  const orderId = intent.metadata?.order_id;
  const [order] = UUID_PATTERN.test(String(orderId || ""))
    ? await sql`SELECT order_number, total_amount, currency FROM orders WHERE id = ${orderId}`
    : [];
  if (!order) return unknown;

  const states = { succeeded: "paid", requires_capture: "authorized", processing: "processing", requires_action: "action", requires_confirmation: "action" };
  const state = states[intent.status] || "failed";

  let details = null;
  if (PLACED_STATES.has(state)) {
    try {
      const confirmation = await getOrderConfirmation(orderId);
      if (confirmation) {
        details = {
          ...confirmation,
          // The email the customer typed at checkout went to Stripe as the receipt address.
          customer: { ...confirmation.customer, email: confirmation.customer.email || intent.receipt_email || "" },
          paymentMethod: describePaymentMethod(intent.payment_method),
        };
      }
    } catch (error) {
      console.error("Could not load the order details for the confirmation page", error.message);
    }
  }

  return {
    state,
    orderNumber: order.order_number,
    total: Number(order.total_amount) || 0,
    currency: order.currency,
    details,
  };
}
