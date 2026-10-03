import { sql } from "./db";
import { formatCurrency } from "./currency";
import { loadMoneyFormat } from "./moneyFormat";
import { listRecentOrders } from "./orders";
import { getInventoryReport } from "./reports";
import { getProductsSettings } from "./productsSettings";
import { listCoupons } from "./coupons";
import { resolveRange } from "./dashboardRanges";

// Each widget loads independently so one unmigrated table or DB hiccup
// blanks that widget instead of the whole dashboard.
async function safe(fn, fallback) {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function trend(current, previous) {
  if (!previous) return { trend: "up", change: current > 0 ? "New" : "0%" };
  const pct = ((current - previous) / previous) * 100;
  return { trend: pct >= 0 ? "up" : "down", change: `${Math.abs(pct).toFixed(1)}%` };
}

const fmtInt = (n) => Number(n || 0).toLocaleString("en-US");

// Counts orders placed in the selected window and compares each against the
// equally long window immediately before it.
async function getOrderStats(days, currency, moneyFormat) {
  const [row] = await sql`
    WITH bounds AS (
      SELECT now() - make_interval(days => ${days}) AS cur_start,
             now() - make_interval(days => ${days * 2}) AS prev_start
    )
    SELECT
      COUNT(*) FILTER (WHERE placed_at >= b.cur_start)::int AS total,
      COUNT(*) FILTER (WHERE placed_at >= b.prev_start AND placed_at < b.cur_start)::int AS total_prev,
      COUNT(*) FILTER (WHERE placed_at >= b.cur_start AND status = 'Pending')::int AS pending,
      COUNT(*) FILTER (WHERE placed_at >= b.prev_start AND placed_at < b.cur_start AND status = 'Pending')::int AS pending_prev,
      COUNT(*) FILTER (WHERE placed_at >= b.cur_start AND status = 'Processing')::int AS processing,
      COUNT(*) FILTER (WHERE placed_at >= b.prev_start AND placed_at < b.cur_start AND status = 'Processing')::int AS processing_prev,
      COUNT(*) FILTER (WHERE placed_at >= b.cur_start AND status = 'Completed')::int AS completed,
      COUNT(*) FILTER (WHERE placed_at >= b.prev_start AND placed_at < b.cur_start AND status = 'Completed')::int AS completed_prev,
      COUNT(*) FILTER (WHERE placed_at >= b.cur_start AND status = 'Cancelled')::int AS cancelled,
      COUNT(*) FILTER (WHERE placed_at >= b.prev_start AND placed_at < b.cur_start AND status = 'Cancelled')::int AS cancelled_prev,
      COALESCE(SUM(total_amount) FILTER (WHERE placed_at >= b.cur_start AND payment_status = 'Paid'), 0) AS sales,
      COALESCE(SUM(total_amount) FILTER (WHERE placed_at >= b.prev_start AND placed_at < b.cur_start AND payment_status = 'Paid'), 0) AS sales_prev
    FROM orders, bounds b
  `;
  const card = (icon, iconColor, label, key) => ({
    icon,
    iconColor,
    label,
    value: fmtInt(row[key]),
    ...trend(row[key], row[`${key}_prev`]),
  });
  return {
    orderStats: [
      card("shopping-bag", "primary", "Total Orders", "total"),
      card("clock", "warning", "Pending Orders", "pending"),
      card("refresh-cw", "info", "Processing", "processing"),
      card("check-circle", "success", "Completed", "completed"),
      card("x-circle", "error", "Cancelled", "cancelled"),
    ],
    totalSales: {
      value: formatCurrency(row.sales, currency, moneyFormat),
      label: "Total Sales",
      ...trend(Number(row.sales), Number(row.sales_prev)),
    },
  };
}

async function getProductStats() {
  const [inventory, [counts]] = await Promise.all([
    getInventoryReport(),
    sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active FROM products`,
  ]);
  return [
    { icon: "package", iconColor: "primary", value: fmtInt(counts.total), label: "Total Products" },
    { icon: "check-circle", iconColor: "success", value: fmtInt(counts.active), label: "Active Products" },
    { icon: "x-circle", iconColor: "error", value: fmtInt(inventory.outOfStock), label: "Out of Stock" },
    { icon: "alert-triangle", iconColor: "warning", value: fmtInt(inventory.lowStock), label: "Low Stock" },
  ];
}

async function getCouponStats() {
  const coupons = await listCoupons();
  return [
    { icon: "tag", iconColor: "accent", value: fmtInt(coupons.length), label: "Total Coupons" },
    {
      icon: "check-circle",
      iconColor: "success",
      value: fmtInt(coupons.filter((c) => c.status === "ACTIVE").length),
      label: "Active Coupons",
    },
  ];
}

// Sales count only Paid orders; order volume counts every non-cancelled order.
async function getSalesChartData() {
  const [daily, weekly, monthly] = await Promise.all([
    sql`
      SELECT to_char(d, 'Dy') AS label,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'Paid'), 0) AS sales,
        COUNT(o.id)::int AS orders
      FROM generate_series(date_trunc('day', now()) - interval '6 days', date_trunc('day', now()), interval '1 day') d
      LEFT JOIN orders o ON date_trunc('day', o.placed_at) = d AND o.status <> 'Cancelled'
      GROUP BY d ORDER BY d`,
    sql`
      SELECT 'Week ' || (row_number() OVER (ORDER BY d))::text AS label,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'Paid'), 0) AS sales,
        COUNT(o.id)::int AS orders
      FROM generate_series(date_trunc('day', now()) - interval '27 days', date_trunc('day', now()) - interval '6 days', interval '7 days') d
      LEFT JOIN orders o ON o.placed_at >= d AND o.placed_at < d + interval '7 days' AND o.status <> 'Cancelled'
      GROUP BY d ORDER BY d`,
    sql`
      SELECT to_char(d, 'Mon') AS label,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'Paid'), 0) AS sales,
        COUNT(o.id)::int AS orders
      FROM generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') d
      LEFT JOIN orders o ON date_trunc('month', o.placed_at) = d AND o.status <> 'Cancelled'
      GROUP BY d ORDER BY d`,
  ]);
  const shape = (rows) => ({
    labels: rows.map((r) => r.label),
    sales: rows.map((r) => Number(r.sales)),
    orders: rows.map((r) => r.orders),
  });
  return { daily: shape(daily), weekly: shape(weekly), monthly: shape(monthly) };
}

// Month-by-month totals for this year and last, for the Earning Statistic
// card. There's no cost data on orders (no line items), so profit can't be
// computed; the third tile is unpaid order value instead.
//   sales   = every non-cancelled order
//   income  = the Paid ones (what has actually come in)
//   pending = non-cancelled orders not yet paid
async function getEarningStats() {
  const rows = await sql`
    SELECT EXTRACT(YEAR FROM placed_at)::int AS year, EXTRACT(MONTH FROM placed_at)::int AS month,
      COALESCE(SUM(total_amount), 0) AS sales,
      COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'Paid'), 0) AS income,
      COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'Unpaid'), 0) AS pending
    FROM orders
    WHERE status <> 'Cancelled'
      AND placed_at >= date_trunc('year', now()) - interval '1 year'
    GROUP BY 1, 2`;
  const thisYear = new Date().getFullYear();
  const build = (year) => {
    const income = Array(12).fill(0);
    const totals = { sales: 0, income: 0, pending: 0 };
    for (const r of rows) {
      if (r.year !== year) continue;
      income[r.month - 1] = Number(r.income);
      totals.sales += Number(r.sales);
      totals.income += Number(r.income);
      totals.pending += Number(r.pending);
    }
    return { label: String(year), income, totals };
  };
  return { years: [build(thisYear), build(thisYear - 1)] };
}

// There's no order line-items table yet (orders is the "table-only" variant),
// so units sold / revenue per product can't be computed honestly. Show stock
// health instead, lowest stock first.
async function getProductStock(currency, moneyFormat, limit = 5) {
  const { lowStockThreshold } = await getProductsSettings();
  const threshold = Number(lowStockThreshold) || 0;
  const rows = await sql`
    SELECT p.title, p.status, p.price, c.name AS category_name,
      COALESCE(v.variant_qty, p.inventory_quantity, 0)::int AS inventory
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN (
      SELECT product_id, SUM(inventory_quantity) AS variant_qty FROM product_variants GROUP BY product_id
    ) v ON v.product_id = p.id
    ORDER BY COALESCE(v.variant_qty, p.inventory_quantity, 0) ASC, p.created_at DESC
    LIMIT ${limit}`;
  const iconColors = ["accent", "primary", "success", "info"];
  return rows.map((r, i) => {
    const level = r.inventory <= 0 ? "out" : r.inventory <= threshold ? "low" : "ok";
    const active = r.status === "ACTIVE";
    return {
      name: r.title,
      category: r.category_name || "Uncategorized",
      price: formatCurrency(r.price, currency, moneyFormat),
      stock: `${r.inventory} unit${r.inventory === 1 ? "" : "s"}`,
      stockLevel: level,
      status: level === "out" ? "Out of Stock" : level === "low" ? "Low Stock" : active ? "Active" : "Draft",
      statusColor: level === "out" ? "error" : level === "low" ? "warning" : active ? "success" : "info",
      iconColor: iconColors[i % iconColors.length],
    };
  });
}

const AVATAR_COLORS = ["primary", "accent", "info", "success", "error"];

function initialsFor(name) {
  const parts = String(name || "").trim().split(/s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Keep the first 3 and last 2 digits, e.g. 017******58.
function maskPhone(phone) {
  const digits = String(phone || "").replace(/D/g, "");
  if (digits.length < 6) return "";
  return digits.slice(0, 3) + "*".repeat(digits.length - 5) + digits.slice(-2);
}

// Ranked by number of non-cancelled orders. Orders keep a customer_name
// snapshot, so guest/deleted-customer orders still group by name.
async function getTopCustomers(limit = 6) {
  const rows = await sql`
    SELECT COALESCE(o.customer_id::text, lower(o.customer_name)) AS key,
      MAX(o.customer_name) AS name, MAX(c.phone) AS phone, MAX(c.email) AS email,
      COUNT(*)::int AS orders
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.status <> 'Cancelled'
    GROUP BY 1
    ORDER BY orders DESC, name ASC
    LIMIT ${limit}`;
  return rows.map((r, i) => ({
    key: r.key,
    name: r.name,
    initials: initialsFor(r.name),
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
    contact: maskPhone(r.phone) || r.email || "",
    orders: r.orders,
  }));
}

export async function getDashboardData({ rangeKey, currency = "USD" } = {}) {
  const range = resolveRange(rangeKey);
  const moneyFormat = await loadMoneyFormat();
  const [orderBlock, productStats, couponStats, salesChartData, recentOrders, productStock, topCustomers, earningStats] =
    await Promise.all([
      safe(() => getOrderStats(range.days, currency, moneyFormat), null),
      safe(getProductStats, null),
      safe(getCouponStats, null),
      safe(getSalesChartData, null),
      safe(() => listRecentOrders(5).then((orders) => orders.map((o) => ({ ...o, amount: formatCurrency(o.totalAmount, currency, moneyFormat) }))), []),
      safe(() => getProductStock(currency, moneyFormat, 5), []),
      safe(getTopCustomers, []),
      safe(getEarningStats, null),
    ]);
  return {
    range: range.key,
    orderStats: orderBlock?.orderStats ?? null,
    totalSales: orderBlock?.totalSales ?? null,
    productStats,
    couponStats,
    salesChartData,
    recentOrders,
    productStock,
    topCustomers,
    earningStats,
  };
}
