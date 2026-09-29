import { sql } from "./db";
import { formatCurrency } from "./currency";
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
async function getOrderStats(days, currency) {
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
      value: formatCurrency(row.sales, currency),
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

// There's no order line-items table yet (orders is the "table-only" variant),
// so units sold / revenue per product can't be computed honestly. Show stock
// health instead, lowest stock first.
async function getProductStock(currency, limit = 5) {
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
      price: formatCurrency(r.price, currency),
      stock: `${r.inventory} unit${r.inventory === 1 ? "" : "s"}`,
      stockLevel: level,
      status: level === "out" ? "Out of Stock" : level === "low" ? "Low Stock" : active ? "Active" : "Draft",
      statusColor: level === "out" ? "error" : level === "low" ? "warning" : active ? "success" : "info",
      iconColor: iconColors[i % iconColors.length],
    };
  });
}

// Each check degrades to "not done" on its own — e.g. payment_settings has no
// migration yet, and that must not hide the rest of the checklist.
async function getStoreSetup() {
  const [[store], [pay], [ship], [products], [maint]] = await Promise.all([
    safe(() => sql`SELECT store_name, store_email, logo_url FROM general_settings WHERE id = 1`, []),
    safe(
      () => sql`SELECT (stripe_enabled OR paypal_enabled OR razorpay_enabled OR cod_enabled) AS connected FROM payment_settings WHERE id = 1`,
      []
    ),
    safe(() => sql`SELECT id FROM shipping_settings WHERE id = 1`, []),
    safe(() => sql`SELECT COUNT(*)::int AS count FROM products`, []),
    safe(() => sql`SELECT maintenance_mode_enabled AS enabled FROM system_maintenance_settings WHERE id = 1`, []),
  ]);
  const steps = [
    { label: "Store Profile", done: Boolean(store?.store_name && store?.store_email && store?.logo_url) },
    { label: "Payment Connected", done: Boolean(pay?.connected) },
    { label: "First Product Added", done: (products?.count || 0) > 0 },
    { label: "Shipping Policy", done: Boolean(ship) },
    { label: "Publish Store", done: maint ? !maint.enabled : true },
  ].map((s) => ({ label: s.label, status: s.done ? "done" : "warning" }));
  const completedCount = steps.filter((s) => s.status === "done").length;
  return {
    completedCount,
    totalCount: steps.length,
    percent: Math.round((completedCount / steps.length) * 100),
    steps,
  };
}

function timeAgo(date) {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Built from real records since no activity-log table exists.
async function getRecentActivity(limit = 8) {
  const rows = await sql`
    (SELECT 'order' AS kind, 'New order #' || order_number || ' from ' || customer_name AS text, placed_at AS at FROM orders)
    UNION ALL
    (SELECT 'coupon', 'Coupon "' || code || '" created', created_at FROM coupons)
    UNION ALL
    (SELECT 'product', 'Product "' || title || '" added', created_at FROM products)
    UNION ALL
    (SELECT 'customer', 'New customer ' || first_name || ' ' || last_name, created_at FROM customers)
    ORDER BY at DESC
    LIMIT ${limit}`;
  const icons = {
    order: ["shopping-bag", "success"],
    coupon: ["tag", "accent"],
    product: ["package", "primary"],
    customer: ["user", "neutral"],
  };
  return rows.map((r) => ({ icon: icons[r.kind][0], iconColor: icons[r.kind][1], text: r.text, time: timeAgo(r.at) }));
}

export async function getDashboardData({ rangeKey, currency = "INR" } = {}) {
  const range = resolveRange(rangeKey);
  const [orderBlock, productStats, couponStats, salesChartData, recentOrders, productStock, storeSetup, recentActivity] =
    await Promise.all([
      safe(() => getOrderStats(range.days, currency), null),
      safe(getProductStats, null),
      safe(getCouponStats, null),
      safe(getSalesChartData, null),
      safe(() => listRecentOrders(5), []),
      safe(() => getProductStock(currency, 5), []),
      safe(getStoreSetup, null),
      safe(getRecentActivity, []),
    ]);
  return {
    range: range.key,
    storeSetup,
    orderStats: orderBlock?.orderStats ?? null,
    totalSales: orderBlock?.totalSales ?? null,
    productStats,
    couponStats,
    salesChartData,
    recentOrders,
    productStock,
    recentActivity,
  };
}
