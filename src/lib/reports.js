import { sql } from "./db";
import { getProductsSettings } from "./productsSettings";

// Order Reports -> Order Summary. Refunded is read off payment_status, not
// status — the orders table has no separate "Refunded" order status.
export async function getOrderSummaryReport() {
  const [row] = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed,
      COUNT(*) FILTER (WHERE status = 'Pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'Processing')::int AS processing,
      COUNT(*) FILTER (WHERE status = 'Cancelled')::int AS cancelled,
      COUNT(*) FILTER (WHERE payment_status = 'Refunded')::int AS refunded
    FROM orders
  `;
  return {
    total: row.total,
    completed: row.completed,
    pending: row.pending,
    processing: row.processing,
    cancelled: row.cancelled,
    refunded: row.refunded,
  };
}

// Product Reports -> Inventory Report. Same effective-inventory calculation
// as listProducts() (variant quantity sum, falling back to the product's own
// inventory_quantity), and the real low_stock_threshold setting rather than
// a hardcoded cutoff.
export async function getInventoryReport() {
  const { lowStockThreshold } = await getProductsSettings();
  const threshold = Number(lowStockThreshold) || 0;

  const [row] = await sql`
    SELECT
      COALESCE(SUM(inv.inventory), 0)::int AS current_stock,
      COUNT(*) FILTER (WHERE inv.inventory > ${threshold})::int AS healthy_stock,
      COUNT(*) FILTER (WHERE inv.inventory > 0 AND inv.inventory <= ${threshold})::int AS low_stock,
      COUNT(*) FILTER (WHERE inv.inventory <= 0)::int AS out_of_stock
    FROM (
      SELECT p.id, COALESCE(v.variant_qty, p.inventory_quantity, 0) AS inventory
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(inventory_quantity) FILTER (WHERE inventory_management) AS variant_qty,
          BOOL_OR(inventory_management) AS tracked
        FROM product_variants
        GROUP BY product_id
      ) v ON v.product_id = p.id
      -- Products whose variants are not tracked are always available: not counted.
      WHERE v.product_id IS NULL OR v.tracked
    ) inv
  `;
  return {
    currentStock: row.current_stock,
    healthyStock: row.healthy_stock,
    lowStock: row.low_stock,
    outOfStock: row.out_of_stock,
  };
}

// Payment Reports -> Payment Summary. "Failed" reads 0 until a real
// payment-failure path exists (see docs/orders/orders-database-schema.md
// Design notes) — the column is real, nothing fakes the count.
export async function getPaymentSummaryReport() {
  const [row] = await sql`
    SELECT
      COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'Paid'), 0) AS total_received,
      COUNT(*) FILTER (WHERE payment_status = 'Paid')::int AS paid,
      COUNT(*) FILTER (WHERE payment_status = 'Unpaid')::int AS pending,
      COUNT(*) FILTER (WHERE payment_status = 'Failed')::int AS failed,
      COUNT(*) FILTER (WHERE payment_status = 'Refunded')::int AS refunded,
      MIN(currency) AS currency
    FROM orders
  `;
  return {
    totalReceived: Number(row.total_received) || 0,
    paid: row.paid,
    pending: row.pending,
    failed: row.failed,
    refunded: row.refunded,
    currency: row.currency || "USD",
  };
}

export async function getReportsData() {
  const [orderSummary, inventory, paymentSummary] = await Promise.all([
    getOrderSummaryReport(),
    getInventoryReport(),
    getPaymentSummaryReport(),
  ]);
  return { orderSummary, inventory, paymentSummary };
}
