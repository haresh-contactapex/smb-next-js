import { sql } from "./db";
import { AccountError, isUuid, optionalQuery } from "./accountError";
import { logAdminActivity } from "./notifications";
import { formatCurrency } from "./currency";
import { loadMoneyFormat } from "./moneyFormat";
import { cancelPaymentIntent, createRefund, loadStripeConfig } from "./stripe";
import { sendOrderStatusEmail } from "./orderEmails";
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

// An order the customer can still cancel themselves: it hasn't been completed or cancelled, and it
// is either unpaid (cash on delivery, or a card payment that never went through) or paid by card,
// which is refunded automatically. getCustomerOrder() narrows "paid" to orders that really have a
// card payment to refund; anything else (completed, or paid some other way) is sent to support.
export function canCustomerCancel(order) {
  return (order.status === "Pending" || order.status === "Processing") && ["Unpaid", "Failed", "Paid"].includes(order.paymentStatus);
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

  // A paid order is cancellable only when a succeeded card payment is there to refund.
  const refundable = row.payment_status === "Paid" ? paymentRows.find((payment) => payment.provider === "stripe" && payment.status === "succeeded" && payment.provider_reference) : null;

  return {
    ...summary,
    canCancel: summary.canCancel && (row.payment_status !== "Paid" || Boolean(refundable)),
    // What cancelling would refund to the customer's card, 0 when nothing is to be refunded.
    refundAmount: refundable ? Number(refundable.amount) || 0 : 0,
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

// Cancels one of the customer's own orders if it is still cancellable (Pending or Processing, and
// unpaid or paid by card), tells the store's staff through the admin notification bell and emails
// the customer. A card order that was paid is refunded in full, to the card, through Stripe.
// Returns the order.
//
// The cancellation is taken first, in one UPDATE that only matches while the order is still as it
// was read, so two clicks (or a staff change at the same moment) can't both go through and the
// refund is only ever asked for once. If the refund then fails the order is put back as it was,
// so a customer is never left cancelled-but-unrefunded without being told.
export async function cancelCustomerOrder(customer, orderNumber) {
  const number = String(orderNumber || "").trim().replace(/^#/, "");
  const [order] = await sql`SELECT * FROM orders WHERE customer_id = ${customer.id} AND order_number = ${number}`;
  if (!order) throw new AccountError("We couldn't find that order.", 404);
  if (order.status === "Cancelled") throw new AccountError("This order has already been cancelled.", 409);
  if (!canCustomerCancel({ status: order.status, paymentStatus: order.payment_status })) {
    throw new AccountError("This order can no longer be cancelled online because it has already been completed or refunded. Please contact us and we'll help.", 409);
  }

  const [claimed] = await sql`
    UPDATE orders SET status = 'Cancelled', cancelled_at = now(), updated_at = now()
    WHERE id = ${order.id} AND status = ${order.status} AND payment_status = ${order.payment_status}
    RETURNING *
  `;
  if (!claimed) throw new AccountError("This order has just changed. Please refresh the page and try again.", 409);

  const wasPaid = order.payment_status === "Paid";
  let refundedReference = null;
  try {
    refundedReference = wasPaid ? await refundCardPayment(order, claimed) : await closeOpenCardPayment(order);
  } catch (error) {
    // Put the order back exactly as it was.
    await sql`UPDATE orders SET status = ${order.status}, cancelled_at = NULL, updated_at = now() WHERE id = ${order.id} AND status = 'Cancelled'`.catch((revertError) =>
      console.error(`Order ${order.order_number} could not be put back after a failed cancellation`, revertError.message)
    );
    throw error;
  }

  // The money is back with the customer: record it. A failure here is logged, not thrown, because
  // the refund can't be undone and the customer must be told the order is cancelled and refunded.
  let final = claimed;
  if (wasPaid) {
    try {
      [final] = await sql`UPDATE orders SET payment_status = 'Refunded', updated_at = now() WHERE id = ${order.id} RETURNING *`;
      await sql`UPDATE payments SET status = 'refunded' WHERE order_id = ${order.id} AND provider = 'stripe' AND provider_reference = ${refundedReference}`;
    } catch (error) {
      console.error(`Order ${order.order_number} was refunded but could not be marked Refunded. Fix it in the admin.`, error.message);
    }
  }

  const refundText = wasPaid ? ` and was refunded ${formatCurrency(order.total_amount, order.currency, await loadMoneyFormat())} to their card` : "";
  await logAdminActivity({
    action: "order.cancelled",
    entityType: "order",
    entityId: order.id,
    title: `Order #${order.order_number} cancelled by the customer`,
    description: `${customer.firstName} ${customer.lastName} cancelled this order from their account${refundText}.`,
    severity: "warning",
    metadata: { from: { status: order.status }, to: { status: "Cancelled", ...(wasPaid ? { paymentStatus: "Refunded" } : {}) } },
  });
  await sendOrderStatusEmail(order.id, "cancelled");
  return toOrderSummary(final);
}

// Refunds the whole card payment of a paid order to the customer's card. Throws an AccountError
// (and nothing has been refunded) when that can't be done. Returns the payment's reference.
async function refundCardPayment(order, claimed) {
  const [payment] = await sql`
    SELECT provider_reference FROM payments
    WHERE order_id = ${order.id} AND provider = 'stripe' AND status = 'succeeded' AND provider_reference IS NOT NULL
    ORDER BY created_at DESC LIMIT 1
  `;
  if (!payment) {
    throw new AccountError("This order was paid in a way we can't refund online. Please contact us and we'll help.", 409);
  }

  // The keys are enough to refund a payment already taken, even if Stripe has been switched off since.
  const stripe = await loadStripeConfig();
  if (!stripe.hasKeys) {
    console.error(`Refund for order ${order.order_number} refused: ${stripe.problem}`);
    throw new AccountError("We can't refund your payment right now, so your order has not been cancelled. Please contact us and we'll help.", 503);
  }

  try {
    // A fresh key per cancellation attempt: Stripe would otherwise replay the first attempt's failure.
    await createRefund(stripe.secretKey, {
      paymentIntentId: payment.provider_reference,
      orderId: order.id,
      idempotencyKey: `refund-${order.id}-${new Date(claimed.cancelled_at).getTime()}`,
    });
  } catch (error) {
    // Already refunded (an earlier attempt got through, or staff refunded it): the money is back, carry on.
    if (error?.code !== "charge_already_refunded") {
      console.error(`Stripe could not refund order ${order.order_number}`, error.code || "", error.message);
      throw new AccountError("We couldn't refund your payment right now, so your order has not been cancelled. Please try again in a moment, or contact us.", 502);
    }
  }
  return payment.provider_reference;
}

// An unpaid card order still has an open Stripe payment; closing it stops it being paid after the
// order is cancelled. Best effort: if Stripe can't be reached the order is cancelled anyway (a late
// payment is caught and flagged for a refund by the payment sync).
async function closeOpenCardPayment(order) {
  try {
    const [payment] = await sql`
      SELECT provider_reference FROM payments
      WHERE order_id = ${order.id} AND provider = 'stripe' AND status = 'pending' AND provider_reference IS NOT NULL
      ORDER BY created_at DESC LIMIT 1
    `;
    if (!payment) return null;
    const stripe = await loadStripeConfig();
    if (stripe.hasKeys) await cancelPaymentIntent(stripe.secretKey, payment.provider_reference);
    await sql`UPDATE payments SET status = 'failed' WHERE order_id = ${order.id} AND provider = 'stripe' AND provider_reference = ${payment.provider_reference} AND status = 'pending'`;
  } catch (error) {
    console.error(`The open card payment of order ${order.order_number} could not be closed`, error.message);
  }
  return null;
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
