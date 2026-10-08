import { sql } from "./db";
import { formatCurrency } from "./currency";
import { loadMoneyFormat } from "./moneyFormat";
import { isUuid, optionalQuery } from "./accountError";
import { loadOrderLineEngravings } from "./engraving";

const STATUS_COLORS = { Pending: "warning", Processing: "info", Completed: "success", Cancelled: "error" };
const PAYMENT_COLORS = { Paid: "success", Unpaid: "warning", Refunded: "info", Failed: "error" };
// Cycled by row position for visual variety — not tied to status/payment,
// matching how src/data/ordersData.js varied avatarColor per row.
const AVATAR_COLORS = ["primary", "accent", "info", "success", "error"];

function initialsFor(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatOrderDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function mapOrder(row, index, moneyFormat) {
  return {
    id: `#${row.order_number}`,
    orderId: row.id,
    orderNumber: row.order_number,
    customer: row.customer_name,
    initials: initialsFor(row.customer_name),
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    date: formatOrderDate(row.placed_at),
    placedAt: new Date(row.placed_at).toISOString(),
    products: `${row.item_count} item${row.item_count === 1 ? "" : "s"}`,
    amount: formatCurrency(row.total_amount, row.currency, moneyFormat),
    totalAmount: Number(row.total_amount),
    payment: row.payment_status,
    paymentColor: PAYMENT_COLORS[row.payment_status] || "info",
    status: row.status,
    statusColor: STATUS_COLORS[row.status] || "info",
  };
}

export async function listOrders() {
  const [rows, moneyFormat] = await Promise.all([sql`SELECT * FROM orders ORDER BY placed_at DESC`, loadMoneyFormat()]);
  return rows.map((row, index) => mapOrder(row, index, moneyFormat));
}

export async function listRecentOrders(limit = 5) {
  const [rows, moneyFormat] = await Promise.all([sql`SELECT * FROM orders ORDER BY placed_at DESC LIMIT ${limit}`, loadMoneyFormat()]);
  return rows.map((row, index) => mapOrder(row, index, moneyFormat));
}

export async function getOrderById(id) {
  const [row] = await sql`SELECT * FROM orders WHERE id = ${id}`;
  return row ? mapOrder(row, 0, await loadMoneyFormat()) : null;
}

const toAmount = (value) => (value === null || value === undefined ? null : Number(value));

function toOrderAddress(row) {
  if (!row) return null;
  return {
    fullName: row.full_name,
    company: row.company || "",
    line1: row.address_line1,
    line2: row.address_line2 || "",
    city: row.city,
    state: row.state || "",
    zip: row.postal_code || "",
    country: row.country,
    phone: row.phone || "",
  };
}

// The order and everything hanging off it, as raw rows plus the price breakdown as
// numbers. Shared by the Edit Order page (which formats it for display) and the
// invoice (which formats it into a PDF). The detail tables are optional here — an
// order placed before they existed, or seeded without them, still loads with
// those sections empty.
async function loadOrderDetailRows(id) {
  if (!isUuid(id)) return null;
  const [row] = await sql`SELECT * FROM orders WHERE id = ${id}`;
  if (!row) return null;

  const addressIds = [row.billing_address_id, row.shipping_address_id].filter(Boolean);
  const [moneyFormat, customerRows, addressRows, lineRows, paymentRows, engravings] = await Promise.all([
    loadMoneyFormat(),
    row.customer_id
      ? sql`SELECT email, phone, customer_group, is_guest, created_at FROM customers WHERE id = ${row.customer_id}`
      : [],
    addressIds.length ? optionalQuery(() => sql`SELECT * FROM order_addresses WHERE id = ANY(${addressIds}::uuid[])`, []) : [],
    optionalQuery(
      () => sql`
        SELECT li.id, li.product_id, li.title, li.sku, li.unit_price, li.quantity, li.line_total,
               (SELECT pm.url FROM product_media pm
                 WHERE pm.product_id = li.product_id AND pm.type = 'image' AND pm.url NOT LIKE 'blob:%'
                 ORDER BY pm.position LIMIT 1) AS image
        FROM order_line_items li
        WHERE li.order_id = ${row.id}
        ORDER BY li.line_total DESC, li.title
      `,
      []
    ),
    optionalQuery(() => sql`SELECT * FROM payments WHERE order_id = ${row.id} ORDER BY created_at`, []),
    // What the customer asked to have engraved, per line. Its own query so an order still loads
    // in a database that hasn't been given the engraving columns yet.
    loadOrderLineEngravings(row.id),
  ]);

  const itemsSubtotal = lineRows.reduce((sum, line) => sum + (Number(line.line_total) || 0), 0);
  const hasBreakdown = row.subtotal_amount !== null && row.subtotal_amount !== undefined;
  const subtotal = toAmount(row.subtotal_amount) ?? (lineRows.length ? itemsSubtotal : null);
  const discount = toAmount(row.discount_amount);
  const shipping = toAmount(row.shipping_amount);
  const tax = toAmount(row.tax_amount);
  // The orders table keeps the tax amount but not the rate. With no shipping charge the
  // taxable amount is just the discounted subtotal, so the rate can be worked back out.
  const taxBase = (subtotal ?? 0) - (discount ?? 0);
  const taxRate = tax !== null && !shipping && taxBase > 0 ? Math.round((tax / taxBase) * 10000) / 100 : null;

  return {
    row,
    moneyFormat,
    customer: customerRows[0],
    addressRows,
    lineRows,
    paymentRows,
    engravings,
    amounts: {
      subtotal,
      discount,
      couponCode: row.coupon_code || null,
      shipping,
      tax,
      taxRate,
      // NULL tax on an order that has a price breakdown means the prices already included it.
      taxMode: tax !== null ? "added" : hasBreakdown ? "included" : "unknown",
      total: toAmount(row.total_amount),
    },
  };
}

// Everything the Edit Order page shows: the order itself plus its customer, the
// frozen billing/shipping addresses, line items, price breakdown and payments.
export async function getOrderDetails(id) {
  const details = await loadOrderDetailRows(id);
  if (!details) return null;
  const { row, moneyFormat, customer, addressRows, lineRows, paymentRows, engravings, amounts } = details;

  const money = (amount) => (amount === null ? null : formatCurrency(amount, row.currency, moneyFormat));
  return {
    ...mapOrder(row, 0, moneyFormat),
    customerDetails: {
      name: row.customer_name,
      email: customer?.email || "",
      phone: customer?.phone || "",
      group: customer?.customer_group || "",
      isGuest: Boolean(customer?.is_guest),
      hasAccount: Boolean(customer),
      since: customer ? formatOrderDate(customer.created_at) : "",
    },
    billingAddress: toOrderAddress(addressRows.find((address) => address.id === row.billing_address_id)),
    shippingAddress: toOrderAddress(addressRows.find((address) => address.id === row.shipping_address_id)),
    items: lineRows.map((line) => ({
      id: line.id,
      productId: line.product_id || null,
      title: line.title,
      sku: line.sku || "",
      image: line.image || null,
      quantity: Number(line.quantity) || 1,
      unitPrice: money(toAmount(line.unit_price)),
      lineTotal: money(toAmount(line.line_total)),
      engraving: engravings.get(line.id) || null,
    })),
    pricing: {
      subtotal: money(amounts.subtotal),
      discount: amounts.discount ? money(amounts.discount) : null,
      couponCode: amounts.couponCode,
      shipping: money(amounts.shipping),
      shippingFree: amounts.shipping === 0,
      tax: money(amounts.tax),
      taxRate: amounts.taxRate,
      taxMode: amounts.taxMode,
      total: money(amounts.total),
    },
    payments: paymentRows.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      status: payment.status,
      amount: money(toAmount(payment.amount)),
      reference: payment.provider_reference || "",
      date: formatOrderDate(payment.created_at),
    })),
  };
}

// What the invoice PDF is built from: the same details as getOrderDetails() but
// with plain numbers, so the PDF can lay amounts out in its own columns, plus the
// currency formatting that applies to them.
export async function getOrderInvoice(id) {
  const details = await loadOrderDetailRows(id);
  if (!details) return null;
  const { row, moneyFormat, customer, addressRows, lineRows, paymentRows, engravings, amounts } = details;

  return {
    orderNumber: row.order_number,
    placedAt: new Date(row.placed_at).toISOString(),
    status: row.status,
    paymentStatus: row.payment_status,
    currency: row.currency,
    moneyFormat,
    customer: {
      name: row.customer_name,
      email: customer?.email || "",
      phone: customer?.phone || "",
    },
    billingAddress: toOrderAddress(addressRows.find((address) => address.id === row.billing_address_id)),
    shippingAddress: toOrderAddress(addressRows.find((address) => address.id === row.shipping_address_id)),
    items: lineRows.map((line) => ({
      title: line.title,
      sku: line.sku || "",
      quantity: Number(line.quantity) || 1,
      unitPrice: toAmount(line.unit_price) ?? 0,
      lineTotal: toAmount(line.line_total) ?? 0,
      engraving: engravings.get(line.id) || null,
    })),
    amounts,
    payments: paymentRows.map((payment) => ({
      provider: payment.provider,
      status: payment.status,
      amount: toAmount(payment.amount) ?? 0,
      reference: payment.provider_reference || "",
    })),
  };
}

// What the customer sees on the order-confirmation page right after paying: the same
// details as the invoice, as plain numbers (the page formats them in the store's money
// format) plus each line's photo. No payment references or internal ids leave the
// server; the payment method comes from Stripe, not from here.
export async function getOrderConfirmation(id) {
  const details = await loadOrderDetailRows(id);
  if (!details) return null;
  const { row, customer, addressRows, lineRows, engravings, amounts } = details;
  const billingAddress = toOrderAddress(addressRows.find((address) => address.id === row.billing_address_id));
  const shippingAddress = toOrderAddress(addressRows.find((address) => address.id === row.shipping_address_id));

  return {
    placedAt: new Date(row.placed_at).toISOString(),
    status: row.status,
    paymentStatus: row.payment_status,
    customer: {
      name: row.customer_name,
      // The customer row can be gone (a deleted guest); the checkout's phone is on its addresses too.
      email: customer?.email || "",
      phone: customer?.phone || billingAddress?.phone || shippingAddress?.phone || "",
    },
    billingAddress,
    shippingAddress,
    items: lineRows.map((line) => ({
      id: line.id,
      title: line.title,
      sku: line.sku || "",
      image: line.image || null,
      quantity: Number(line.quantity) || 1,
      unitPrice: toAmount(line.unit_price) ?? 0,
      lineTotal: toAmount(line.line_total) ?? 0,
      engraving: engravings.get(line.id) || null,
    })),
    amounts,
  };
}

// Edit Order only changes status/payment_status today — the other columns
// are snapshots taken at checkout, not something staff retroactively edit.
export async function updateOrderStatus(id, { status, paymentStatus }) {
  if (!Object.keys(STATUS_COLORS).includes(status)) {
    throw new Error(`"${status}" isn't a valid order status.`);
  }
  if (!Object.keys(PAYMENT_COLORS).includes(paymentStatus)) {
    throw new Error(`"${paymentStatus}" isn't a valid payment status.`);
  }

  const [row] = await sql`
    UPDATE orders SET
      status = ${status},
      payment_status = ${paymentStatus},
      cancelled_at = CASE WHEN ${status} = 'Cancelled' THEN COALESCE(cancelled_at, now()) ELSE NULL END,
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return row ? mapOrder(row, 0, await loadMoneyFormat()) : null;
}

// Order statuses a bulk cancel from the orders list applies to. Completed and
// already-cancelled orders are left alone (the edit screen can still change
// any status one order at a time).
export const BULK_CANCELLABLE_STATUSES = ["Pending", "Processing"];

// Bulk cancel: same effect as choosing Cancelled on one order (payment status
// is kept, so a paid order still needs refunding by hand). Returns the orders
// that were actually cancelled; ids that are missing or not cancellable are
// skipped.
export async function cancelOrders(ids) {
  const rows = await sql`
    UPDATE orders SET
      status = 'Cancelled',
      cancelled_at = COALESCE(cancelled_at, now()),
      updated_at = now()
    WHERE id = ANY(${ids}::uuid[]) AND status = ANY(${BULK_CANCELLABLE_STATUSES}::text[])
    RETURNING id, order_number, payment_status
  `;
  return rows.map((row) => ({ id: row.id, orderNumber: row.order_number, paymentStatus: row.payment_status }));
}

// Lightweight lookup for the header's order search dropdown — order number
// or customer name match, same row shape as listOrders() so the dropdown can
// reuse its status/payment color mapping.
export async function searchOrders(query, limit = 8) {
  const like = `%${query}%`;
  const rows = await sql`
    SELECT * FROM orders
    WHERE order_number ILIKE ${like} OR customer_name ILIKE ${like}
    ORDER BY placed_at DESC
    LIMIT ${limit}
  `;
  const moneyFormat = await loadMoneyFormat();
  return rows.map((row, index) => mapOrder(row, index, moneyFormat));
}

export async function getOrderStatusCounts() {
  const rows = await sql`SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status`;
  const counts = { Pending: 0, Processing: 0, Completed: 0, Cancelled: 0 };
  let all = 0;
  for (const row of rows) {
    counts[row.status] = row.count;
    all += row.count;
  }
  return { ...counts, all };
}

// Maps a sidebar nav item id to the getOrderStatusCounts() key it displays.
const NAV_COUNT_KEYS = {
  "all-orders": "all",
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Merges live per-status counts onto the Orders submenu's sub-items so the
// sidebar shows real numbers instead of a static list. Called from the root
// layout after filterNavItemsForRole, which only filters items (never edits
// them), so the counts attached here survive that pass untouched.
export function withOrderNavCounts(navItems, counts) {
  if (!counts) return navItems;
  return navItems.map((item) => {
    if (item.type !== "submenu" || item.id !== "orders") return item;
    return {
      ...item,
      items: item.items.map((sub) => {
        const key = NAV_COUNT_KEYS[sub.id];
        return key && counts[key] > 0 ? { ...sub, count: counts[key] } : sub;
      }),
    };
  });
}
