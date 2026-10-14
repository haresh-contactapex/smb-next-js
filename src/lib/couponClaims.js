import { sql } from "./db";

// A coupon use is claimed when an order is placed (checkoutOrders.js, inside the order's own
// transaction) and recorded in coupon_redemptions. These give a use back when the order that
// held it will never be paid. Both are safe before docs/vouchers-coupons/coupon-redemptions-only.sql
// has been applied: with no table there is nothing recorded to give back.

// An order cancelled before it was paid releases its use. Best effort: a hiccup here must never
// stop the cancellation itself.
export async function releaseCouponClaim(orderId) {
  try {
    await sql`
      WITH gone AS (
        DELETE FROM coupon_redemptions WHERE order_id = ${orderId} RETURNING coupon_id
      ), counts AS (
        SELECT coupon_id, count(*)::int AS n FROM gone GROUP BY coupon_id
      )
      UPDATE coupons c SET usage_count = GREATEST(c.usage_count - counts.n, 0), updated_at = now()
      FROM counts WHERE c.id = counts.coupon_id
    `;
  } catch (error) {
    if (error?.code !== "42P01") console.error("Could not release the coupon use held by an order", error.message);
  }
}

// Before a new order claims `code`, frees uses held by card orders that were started but never
// paid: any older than a day, and this customer's own earlier attempt at the same code (a page
// reload or a second tab starts a fresh order, which must not be blocked by the abandoned one).
// Returns the Stripe PaymentIntent ids of the orders it freed, for the caller to cancel so the
// abandoned attempt can't still be paid later and use the coupon a second time.
export async function releaseStaleCouponClaims({ customerId, code }) {
  try {
    const rows = await sql`
      WITH stale AS (
        DELETE FROM coupon_redemptions r
        USING orders o
        WHERE r.order_id = o.id
          AND o.payment_status IN ('Unpaid', 'Failed')
          AND o.status <> 'Cancelled'
          AND EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id AND p.provider = 'stripe' AND p.status <> 'succeeded')
          AND (
            o.placed_at < now() - interval '24 hours'
            OR (
              ${customerId}::uuid IS NOT NULL AND r.customer_id = ${customerId}::uuid
              AND r.coupon_id = (SELECT id FROM coupons WHERE code = ${code})
            )
          )
        RETURNING r.order_id, r.coupon_id
      ), counts AS (
        SELECT coupon_id, count(*)::int AS n FROM stale GROUP BY coupon_id
      ), bump AS (
        UPDATE coupons c SET usage_count = GREATEST(c.usage_count - counts.n, 0), updated_at = now()
        FROM counts WHERE c.id = counts.coupon_id
        RETURNING c.id
      )
      SELECT p.provider_reference AS intent_id
      FROM stale s
      JOIN payments p ON p.order_id = s.order_id AND p.provider = 'stripe'
      WHERE p.provider_reference IS NOT NULL
    `;
    return rows.map((row) => row.intent_id);
  } catch (error) {
    if (error?.code !== "42P01") console.error("Could not free stale coupon uses", error.message);
    return [];
  }
}
