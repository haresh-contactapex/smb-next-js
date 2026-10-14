-- Coupon redemptions (subset of vouchers-coupons-database-schema.sql). Needs the coupons,
-- orders and customers tables to exist already.
--
-- One row per order that used a coupon. Placing the order claims the use in the same
-- transaction (coupons.usage_count + 1, only while usage_limit allows it) and inserts the
-- row; cancelling an unpaid order releases it again (src/lib/couponClaims.js). The partial
-- unique index is what stops a customer using a one-per-customer coupon twice, even when
-- two orders are placed at the same moment.
--
-- Safe to run more than once, including against a table created from the full schema file.
-- Dialect: PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id         UUID NOT NULL REFERENCES coupons (id) ON DELETE CASCADE,
    order_id          UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    customer_id       UUID NULL REFERENCES customers (id) ON DELETE SET NULL,
    discount_amount   DECIMAL(12, 2) NOT NULL,
    one_per_customer  BOOLEAN NOT NULL DEFAULT false,
    redeemed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE coupon_redemptions ADD COLUMN IF NOT EXISTS one_per_customer BOOLEAN NOT NULL DEFAULT false;

COMMENT ON TABLE coupon_redemptions IS 'One row per order that used a coupon; claimed when the order is placed, released if the unpaid order is cancelled.';
COMMENT ON COLUMN coupon_redemptions.one_per_customer IS 'Copy of coupons.one_per_customer at redemption time; only rows with it set take part in the per-customer unique index.';

CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_order_coupon_key ON coupon_redemptions (order_id, coupon_id);
CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_one_per_customer_key
    ON coupon_redemptions (coupon_id, customer_id) WHERE one_per_customer AND customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_id_idx ON coupon_redemptions (coupon_id);
