import { sql } from "./db";
import { AccountError, isUuid, optionalQuery } from "./accountError";
import { logAdminActivity } from "./notifications";
import { getWishlistProducts } from "./wishlist";

// Server side of the account's order history (/account/orders). The customer
// only ever sees their own orders: every query filters on customer_id, and an
// order that exists but belongs to someone else reads as "not found".
//
// The orders table is all the listing needs. Line items, saved addresses and
// payments live in the fuller orders schema (docs/orders/orders-database-schema.sql),
// which a store may not have applied yet, so those lookups are optional: when
// their tables are missing the order still shows, just without that detail.

export const ORDER_STATUSES = ["Pending", "Processing", "Completed", "Cancelled"];
export const ORDERS_PAGE_SIZE = 10;

// An order the customer can still cancel themselves: nothing has been paid yet
// and the store hasn't started on it. Anything else needs the store (a refund,
// or an order already being made), so it is sent to support instead.
export function canCustomerCancel(order) {
  return order.status === "Pending" && (order.paymentStatus === "Unpaid" || order.paymentStatus === "Failed");
}

function toOrderSummary(row) {
  const summary = {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentStatus: row.payment_status,
    total: Number(row.total_amount) || 0,
    currency: row.currency,
    itemCount: Number(row.item_count) || 0,
    placedAt: new Date(row.placed_at).toISOString(),
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : null,
  };
  return { ...summary, canCancel: canCustomerCancel(summary) };
}

// Each line's photo below is the product's first uploaded image, never a
// browser-only blob: URL left over from the media library.
function toLine(row) {
  return {
    id: row.id,
    productId: row.product_id || null,
    variantId: row.variant_id || null,
    handle: row.handle || null,
    title: row.title,
    sku: row.sku || "",
    unitPrice: Number(row.unit_price) || 0,
    quantity: Number(row.quantity) || 1,
    lineTotal: Number(row.line_total) || 0,
    image: row.image || null,
  };
}

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

// Only the tail of a gateway reference is shown, enough to quote to support.
function maskReference(reference) {
  const value = String(reference || "");
  return value.length > 4 ? `…${value.slice(-4)}` : value;
}

function toPayment(row) {
  return {
    provider: row.provider,
    status: row.status,
    amount: Number(row.amount) || 0,
    reference: maskReference(row.provider_reference),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

// Order counts per status for this customer, for the filter tabs and the overview.
export async function getCustomerOrderCounts(customerId) {
  const rows = await sql`SELECT status, COUNT(*)::int AS count FROM orders WHERE customer_id = ${customerId} GROUP BY status`;
  const counts = { all: 0, Pending: 0, Processing: 0, Completed: 0, Cancelled: 0 };
  for (const row of rows) {
    counts[row.status] = row.count;
    counts.all += row.count;
  }
  return counts;
}

// One page of the customer's orders, newest first, optionally narrowed to a
// status and/or an order-number search. Each order carries up to three product
// thumbnails when line items are available. `page` is clamped into range.
export async function listCustomerOrders(customerId, { status, q, page = 1, pageSize = ORDERS_PAGE_SIZE } = {}) {
  const statusFilter = ORDER_STATUSES.includes(status) ? status : null;
  const term = String(q || "").trim().replace(/^#/, "").slice(0, 40);
  const like = term ? `%${term.replace(/[\\%_]/g, "\\$&")}%` : null;

  const [{ total }] = await sql`
    SELECT COUNT(*)::int AS total FROM orders
    WHERE customer_id = ${customerId}
      AND (${statusFilter}::text IS NULL OR status = ${statusFilter})
      AND (${like}::text IS NULL OR order_number ILIKE ${like})
  `;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, Number.parseInt(page, 10) || 1), pageCount);

  const rows = await sql`
    SELECT * FROM orders
    WHERE customer_id = ${customerId}
      AND (${statusFilter}::text IS NULL OR status = ${statusFilter})
      AND (${like}::text IS NULL OR order_number ILIKE ${like})
    ORDER BY placed_at DESC, id
    LIMIT ${pageSize} OFFSET ${(currentPage - 1) * pageSize}
  `;
  const orders = rows.map(toOrderSummary);

  const orderIds = orders.map((order) => order.id);
  const lineRows = orderIds.length
    ? await optionalQuery(
        () => sql`
          SELECT li.order_id, li.title, li.quantity, (SELECT pm.url FROM product_media pm
             WHERE pm.product_id = li.product_id AND pm.type = 'image' AND pm.url NOT LIKE 'blob:%'
             ORDER BY pm.position LIMIT 1) AS image
          FROM order_line_items li
          WHERE li.order_id = ANY(${orderIds}::uuid[])
          ORDER BY li.line_total DESC, li.title
        `,
        []
      )
    : [];
  for (const order of orders) {
    order.preview = lineRows
      .filter((line) => line.order_id === order.id)
      .slice(0, 3)
      .map((line) => ({ title: line.title, image: line.image || null }));
  }

  return { orders, total, page: currentPage, pageCount, pageSize };
}

// Everything the order page shows. Returns null when the number isn't one of
// this customer's orders.
export async function getCustomerOrder(customerId, orderNumber) {
  const number = String(orderNumber || "").trim().replace(/^#/, "");
  if (!number || number.length > 30) return null;

  const [row] = await sql`SELECT * FROM orders WHERE customer_id = ${customerId} AND order_number = ${number}`;
  if (!row) return null;

  const addressIds = [row.shipping_address_id, row.billing_address_id].filter(Boolean);
  const [lineRows, addressRows, paymentRows] = await Promise.all([
    optionalQuery(
      () => sql`
        SELECT li.id, li.product_id, li.variant_id, li.title, li.sku, li.unit_price, li.quantity, li.line_total,
               p.handle, (SELECT pm.url FROM product_media pm
             WHERE pm.product_id = li.product_id AND pm.type = 'image' AND pm.url NOT LIKE 'blob:%'
             ORDER BY pm.position LIMIT 1) AS image
        FROM order_line_items li
        LEFT JOIN products p ON p.id = li.product_id
        WHERE li.order_id = ${row.id}
        ORDER BY li.line_total DESC, li.title
      `,
      []
    ),
    addressIds.length
      ? optionalQuery(() => sql`SELECT * FROM order_addresses WHERE id = ANY(${addressIds}::uuid[])`, [])
      : [],
    optionalQuery(() => sql`SELECT * FROM payments WHERE order_id = ${row.id} ORDER BY created_at`, []),
  ]);

  const items = lineRows.map(toLine);
  const itemsSubtotal = items.reduce((sum, line) => sum + line.lineTotal, 0);
  const summary = toOrderSummary(row);

  return {
    ...summary,
    customerName: row.customer_name,
    updatedAt: new Date(row.updated_at).toISOString(),
    items,
    // The orders table stores one total; when line items add up to less, the
    // remainder is shipping, tax and any discount, shown as a single row.
    itemsSubtotal,
    adjustments: items.length ? Math.round((summary.total - itemsSubtotal + Number.EPSILON) * 100) / 100 : 0,
    shippingAddress: toOrderAddress(addressRows.find((address) => address.id === row.shipping_address_id)),
    billingAddress: toOrderAddress(addressRows.find((address) => address.id === row.billing_address_id)),
    payments: paymentRows.map(toPayment),
  };
}

// Cancels one of the customer's own orders if it is still cancellable, and tells
// the store's staff through the admin notification bell. Returns the order.
export async function cancelCustomerOrder(customer, orderNumber) {
  const number = String(orderNumber || "").trim().replace(/^#/, "");
  const [cancelled] = await sql`
    UPDATE orders SET status = 'Cancelled', cancelled_at = now(), updated_at = now()
    WHERE customer_id = ${customer.id} AND order_number = ${number}
      AND status = 'Pending' AND payment_status IN ('Unpaid', 'Failed')
    RETURNING *
  `;

  if (!cancelled) {
    const [existing] = await sql`SELECT status FROM orders WHERE customer_id = ${customer.id} AND order_number = ${number}`;
    if (!existing) throw new AccountError("We couldn't find that order.", 404);
    if (existing.status === "Cancelled") throw new AccountError("This order has already been cancelled.", 409);
    throw new AccountError(
      "This order can no longer be cancelled online because it has already been paid for or is being prepared. Please contact us and we'll help.",
      409
    );
  }

  await logAdminActivity({
    action: "order.cancelled",
    entityType: "order",
    entityId: cancelled.id,
    title: `Order #${cancelled.order_number} cancelled by the customer`,
    description: `${customer.firstName} ${customer.lastName} cancelled this order from their account.`,
    severity: "warning",
    metadata: { from: { status: "Pending" }, to: { status: "Cancelled" } },
  });
  return toOrderSummary(cancelled);
}

// What "Order again" puts in the cart: each line of the order priced and checked
// against the catalog as it is now, never at the old price. A line whose product
// is gone, or whose color/size no longer exists, is returned in `skipped` with
// a reason instead; an out-of-stock line is skipped too. The shape of `lines`
// is what the cart's addItem() takes, plus a quantity.
export async function buildReorderLines(customerId, orderNumber) {
  const order = await getCustomerOrder(customerId, orderNumber);
  if (!order) throw new AccountError("We couldn't find that order.", 404);
  if (order.items.length === 0) throw new AccountError("The items on this order aren't available to reorder.", 409);

  const productIds = [...new Set(order.items.map((item) => item.productId).filter(isUuid))];
  const products = await getWishlistProducts(productIds);

  const lines = [];
  const skipped = [];
  for (const item of order.items) {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) {
      skipped.push({ title: item.title, reason: "This product is no longer available." });
      continue;
    }

    const hasVariants = product.variants.length > 0;
    const variant = hasVariants ? product.variants.find((candidate) => candidate.id === item.variantId) : null;
    if (hasVariants && !variant) {
      skipped.push({ title: item.title, reason: "That color or size is no longer offered." });
      continue;
    }
    if (variant && !variant.available) {
      skipped.push({ title: item.title, reason: "This item is out of stock right now." });
      continue;
    }

    const price = variant ? variant.price : product.price;
    const compareAtPrice = variant ? variant.compareAtPrice : product.compareAtPrice;
    lines.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      handle: product.handle,
      title: product.title,
      image: product.image,
      // In the product's own option order; a variant's keys come back from SQL in no fixed order.
      options: variant ? Object.fromEntries(product.options.map((option) => [option.name, variant.options[option.name]])) : {},
      sku: variant?.sku || product.sku,
      price,
      compareAtPrice: compareAtPrice > price ? compareAtPrice : null,
      maxQuantity: variant?.maxQuantity ?? null,
      quantity: item.quantity,
    });
  }
  return { lines, skipped };
}
