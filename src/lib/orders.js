import { sql } from "./db";
import { formatCurrency } from "./currency";
import { loadMoneyFormat } from "./moneyFormat";

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
