import { sql } from "./db";
import { formatCurrency } from "./currency";
import { loadMoneyFormat } from "./moneyFormat";
import { getOrderConfirmation } from "./orders";
import { getGeneralSettings } from "./generalSettings";
import { getShippingSettings } from "./shippingSettings";
import { getEmailSettings } from "./emailSettings";
import { isEmailConfigured, sendNewOrderAlertEmail, sendOrderConfirmationEmail, sendOrderStatusEmail as sendStatusEmail, sendRefundRequestAlertEmail } from "./email";
import { after } from "next/server";
import { getSiteOrigin, isPublicOrigin } from "./siteUrl";

// When each order email goes out, and what fills it from the order. The templates are in
// orderEmail.js; the sending (SMTP, sender name and address from Settings -> Email) is in
// email.js. Every function here is best-effort and awaited (a serverless function can be
// frozen the moment the response goes out): a problem is logged and never fails the order,
// the payment sync or the status change that triggered it.
//
//   sendOrderConfirmation   customer, once an order is placed (COD) or paid (card)
//                           Settings -> Email -> order confirmation emails
//   sendOrderStatusEmail    customer, when the order is Processing / Completed / Cancelled,
//                           or its card payment failed
//                           a separate switch for each, in Settings -> Email
//   sendNewOrderAlert       the store, when a new order arrives
//                           Settings -> Email -> new order emails, to the General store email
//   sendRefundRequestAlert  the store, when a customer cancels a paid order: it refunds it by hand
//                           (always sent, it is something to act on), to the General store email

// Building and sending an email takes several seconds (a dozen database reads, then SMTP), so it
// runs after the response has gone out (Next's after()): the customer's confirmation page and the
// admin's Save don't wait for it, and a serverless host keeps the function alive until it finishes.
// The store's address is read from the request first, because request headers can't be read once
// the response is done. Outside a request (a script) there is no after(), so it just runs inline.
async function later(deliver) {
  const origin = await getSiteOrigin();
  try {
    after(() => deliver(origin));
    return;
  } catch {
    await deliver(origin);
  }
}

const addressLines = (address) =>
  address
    ? [address.fullName, address.line1, address.line2, [address.city, [address.state, address.zip].filter(Boolean).join(" ")].filter(Boolean).join(", "), address.country].filter(Boolean)
    : [];

// A store that hasn't migrated a settings table yet keeps today's behavior: the email is sent.
const orNull = (read) => read().catch(() => null);

// Everything the templates share, or null (with a log line) when the order can't be emailed about.
async function loadOrderEmail(orderId, origin, { needsCustomerEmail = true } = {}) {
  const [order] = await sql`
    SELECT o.order_number, o.currency, o.status, o.payment_status, c.is_guest
    FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ${orderId}
  `;
  const details = await getOrderConfirmation(orderId);
  if (!order || !details) return null;
  if (needsCustomerEmail && !details.customer.email) {
    console.error(`Order email not sent for order ${order.order_number}: no customer email on file.`);
    return null;
  }

  const [general, shipping, moneyFormat] = await Promise.all([getGeneralSettings(), orNull(getShippingSettings), loadMoneyFormat()]);
  const money = (amount) => formatCurrency(amount, order.currency, moneyFormat);
  const { amounts } = details;
  // A photo is only worth including when the customer's mail client can reach it.
  const imageUrl = (image) => (!image ? null : /^https?:\/\//.test(image) ? image : image.startsWith("/") && isPublicOrigin(origin) ? `${origin}${image}` : null);

  return {
    order,
    details,
    general,
    data: {
      storeName: general.storeName,
      shopUrl: origin,
      orderNumber: order.order_number,
      placedAt: new Date(details.placedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      total: money(amounts.total),
      items: details.items.map((item) => ({ title: item.title, quantity: item.quantity, lineTotal: money(item.lineTotal), imageUrl: imageUrl(item.image) })),
      amounts: {
        subtotal: money(amounts.subtotal ?? amounts.total),
        discount: amounts.discount > 0 ? money(amounts.discount) : "",
        couponCode: amounts.couponCode,
        shipping: amounts.shipping === null ? "" : amounts.shipping > 0 ? money(amounts.shipping) : "Free",
        tax: amounts.tax > 0 ? money(amounts.tax) : "",
      },
      shippingAddress: addressLines(details.shippingAddress),
      billingAddress: addressLines(details.billingAddress),
      processingDays: Number(shipping?.processingTimeDays) || 0,
    },
  };
}

// The email to the customer: their name, a link to the order in their account (a guest has no
// account), and the address people can write to, which is the sender address in Settings -> Email.
async function customerEmail(orderId, origin, emailSettings) {
  const loaded = await loadOrderEmail(orderId, origin);
  if (!loaded) return null;
  const { order, details, general, data } = loaded;
  return {
    order,
    to: details.customer.email,
    data: {
      ...data,
      supportEmail: emailSettings?.senderEmail || general.storeEmail || "",
      firstName: String(details.customer.name || "").trim().split(/\s+/)[0] || "there",
      viewUrl: origin && !order.is_guest ? `${origin}/account/orders/${encodeURIComponent(order.order_number)}` : null,
    },
  };
}

async function ready(label, orderId) {
  if (await isEmailConfigured()) return true;
  console.error(`${label} not sent for order ${orderId}: SMTP is not configured in Settings -> Email.`);
  return false;
}

// `paymentLabel` is how the customer paid ("Visa ending 4242", "Cash on delivery").
export function sendOrderConfirmation(orderId, { cod = false, paymentLabel }) {
  return later((origin) => deliverOrderConfirmation(orderId, origin, { cod, paymentLabel }));
}

async function deliverOrderConfirmation(orderId, origin, { cod, paymentLabel }) {
  try {
    const emailSettings = await orNull(getEmailSettings);
    if (emailSettings && !emailSettings.sendOrderConfirmationEmails) return;
    if (!(await ready("Order confirmation email", orderId))) return;
    const email = await customerEmail(orderId, origin, emailSettings);
    if (email) await sendOrderConfirmationEmail({ to: email.to, ...email.data, paymentLabel, cod });
  } catch (error) {
    console.error("Order confirmation email failed", error.message);
  }
}

// Each customer status email has its own switch in Settings -> Email (the Completed one is stored
// in the older "shipping notification" column).
const STATUS_EMAIL_SWITCH = {
  processing: "sendProcessingOrderEmails",
  completed: "sendShippingNotificationEmails",
  cancelled: "sendCancelledOrderEmails",
  failed: "sendFailedOrderEmails",
};

// kind: "processing" | "completed" | "cancelled" | "failed"
export function sendOrderStatusEmail(orderId, kind) {
  return later((origin) => deliverOrderStatusEmail(orderId, origin, kind));
}

async function deliverOrderStatusEmail(orderId, origin, kind) {
  try {
    const emailSettings = await orNull(getEmailSettings);
    if (emailSettings && !emailSettings[STATUS_EMAIL_SWITCH[kind]]) return;
    if (!(await ready(`Order ${kind} email`, orderId))) return;
    const email = await customerEmail(orderId, origin, emailSettings);
    if (email) await sendStatusEmail(kind, { to: email.to, ...email.data, paid: email.order.payment_status === "Paid", refunded: email.order.payment_status === "Refunded" });
  } catch (error) {
    console.error(`Order ${kind} email failed`, error.message);
  }
}

export function sendNewOrderAlert(orderId, { cod = false, paymentLabel }) {
  return later((origin) => deliverNewOrderAlert(orderId, origin, { cod, paymentLabel }));
}

async function deliverNewOrderAlert(orderId, origin, { cod, paymentLabel }) {
  try {
    const emailSettings = await orNull(getEmailSettings);
    if (emailSettings && !emailSettings.sendNewOrderEmails) return;
    if (!(await ready("New order alert", orderId))) return;

    const loaded = await loadOrderEmail(orderId, origin, { needsCustomerEmail: false });
    if (!loaded) return;
    const { details, general, data } = loaded;
    const to = general.storeEmail;
    if (!to) {
      console.error(`New order alert not sent for order ${data.orderNumber}: set the Store Email in Settings -> General.`);
      return;
    }

    await sendNewOrderAlertEmail({
      to,
      ...data,
      supportEmail: emailSettings?.senderEmail || general.storeEmail || "",
      paymentLabel,
      cod,
      customer: { name: details.customer.name, email: details.customer.email, phone: details.customer.phone },
      adminUrl: origin ? `${origin}/admin/edit-order/${orderId}` : null,
    });
  } catch (error) {
    console.error("New order alert failed", error.message);
  }
}

const PROVIDER_LABELS = { stripe: "Card (Stripe)", paypal: "PayPal", razorpay: "Razorpay", cod: "Cash on delivery" };

export function sendRefundRequestAlert(orderId) {
  return later((origin) => deliverRefundRequestAlert(orderId, origin));
}

async function deliverRefundRequestAlert(orderId, origin) {
  try {
    if (!(await ready("Refund request alert", orderId))) return;
    const loaded = await loadOrderEmail(orderId, origin, { needsCustomerEmail: false });
    if (!loaded) return;
    const { details, general, data } = loaded;
    const to = general.storeEmail;
    if (!to) {
      console.error(`Refund request alert not sent for order ${data.orderNumber}: set the Store Email in Settings -> General.`);
      return;
    }

    // The payment that was taken, so the store can find it in the gateway.
    const [payment] = await sql`
      SELECT provider, provider_reference FROM payments
      WHERE order_id = ${orderId} AND status = 'succeeded' ORDER BY created_at DESC LIMIT 1
    `.catch(() => []);
    const emailSettings = await orNull(getEmailSettings);

    await sendRefundRequestAlertEmail({
      to,
      ...data,
      supportEmail: emailSettings?.senderEmail || general.storeEmail || "",
      paymentLabel: payment ? PROVIDER_LABELS[payment.provider] || payment.provider : "Paid (no payment record)",
      paymentReference: payment?.provider_reference || "",
      customer: { name: details.customer.name, email: details.customer.email, phone: details.customer.phone },
      adminUrl: origin ? `${origin}/admin/edit-order/${orderId}` : null,
    });
  } catch (error) {
    console.error("Refund request alert failed", error.message);
  }
}
