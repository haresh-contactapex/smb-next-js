import { sql } from "./db";
import { formatCurrency } from "./currency";
import { loadMoneyFormat } from "./moneyFormat";
import { getOrderConfirmation } from "./orders";
import { getGeneralSettings } from "./generalSettings";
import { getShippingSettings } from "./shippingSettings";
import { getEmailSettings } from "./emailSettings";
import { getNotificationsSettings } from "./notificationsSettings";
import { isEmailConfigured, sendNewOrderAlertEmail, sendOrderConfirmationEmail, sendOrderStatusEmail as sendStatusEmail } from "./email";
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
//                           Settings -> Notifications -> new order email alert, to its recipient

const addressLines = (address) =>
  address
    ? [address.fullName, address.line1, address.line2, [address.city, [address.state, address.zip].filter(Boolean).join(" ")].filter(Boolean).join(", "), address.country].filter(Boolean)
    : [];

// A store that hasn't migrated a settings table yet keeps today's behavior: the email is sent.
const orNull = (read) => read().catch(() => null);

// Everything the templates share, or null (with a log line) when the order can't be emailed about.
async function loadOrderEmail(orderId, { needsCustomerEmail = true } = {}) {
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

  const [general, shipping, moneyFormat, origin] = await Promise.all([
    getGeneralSettings(),
    orNull(getShippingSettings),
    loadMoneyFormat(),
    getSiteOrigin(),
  ]);
  const money = (amount) => formatCurrency(amount, order.currency, moneyFormat);
  const { amounts } = details;
  // A photo is only worth including when the customer's mail client can reach it.
  const imageUrl = (image) => (!image ? null : /^https?:\/\//.test(image) ? image : image.startsWith("/") && isPublicOrigin(origin) ? `${origin}${image}` : null);

  return {
    order,
    details,
    general,
    origin,
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
async function customerEmail(orderId, emailSettings) {
  const loaded = await loadOrderEmail(orderId);
  if (!loaded) return null;
  const { order, details, general, origin, data } = loaded;
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
export async function sendOrderConfirmation(orderId, { cod = false, paymentLabel }) {
  try {
    const emailSettings = await orNull(getEmailSettings);
    if (emailSettings && !emailSettings.sendOrderConfirmationEmails) return;
    if (!(await ready("Order confirmation email", orderId))) return;
    const email = await customerEmail(orderId, emailSettings);
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
export async function sendOrderStatusEmail(orderId, kind) {
  try {
    const emailSettings = await orNull(getEmailSettings);
    if (emailSettings && !emailSettings[STATUS_EMAIL_SWITCH[kind]]) return;
    if (!(await ready(`Order ${kind} email`, orderId))) return;
    const email = await customerEmail(orderId, emailSettings);
    if (email) await sendStatusEmail(kind, { to: email.to, ...email.data, paid: email.order.payment_status === "Paid" });
  } catch (error) {
    console.error(`Order ${kind} email failed`, error.message);
  }
}

export async function sendNewOrderAlert(orderId, { cod = false, paymentLabel }) {
  try {
    const notifications = await orNull(getNotificationsSettings);
    if (notifications && !notifications.newOrderEmailAlert) return;
    if (!(await ready("New order alert", orderId))) return;

    const loaded = await loadOrderEmail(orderId, { needsCustomerEmail: false });
    if (!loaded) return;
    const { details, general, origin, data } = loaded;
    const to = notifications?.notificationRecipientEmail || general.storeEmail;
    if (!to) {
      console.error(`New order alert not sent for order ${data.orderNumber}: set a recipient in Settings -> Notifications or a store email in Settings -> General.`);
      return;
    }

    const emailSettings = await orNull(getEmailSettings);
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
