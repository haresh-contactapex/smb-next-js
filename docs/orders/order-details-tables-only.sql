-- Order detail tables (subset of orders-database-schema.sql)
-- What the storefront checkout writes when an order is placed: the frozen billing
-- and shipping addresses, one row per line item, and one row per payment attempt.
-- It also adds the price breakdown and the two address links to the orders table.
-- Run it after docs/orders/orders-table-only.sql (the orders table must exist) and
-- docs/auth/customers-table-only.sql, on a database that already has the catalog.
-- Safe to run more than once: every statement is IF NOT EXISTS.
-- Dialect: PostgreSQL
--
-- Differences from the full schema in orders-database-schema.sql:
--   * payments has no payment_method_id: the saved-card table the checkout would
--     link to is customer_payment_methods, and nothing links to it yet.
--   * order_line_items also has the four engraving_* columns (what the customer asked to have
--     engraved). A database created before they existed gets them from
--     docs/engraving/engraving-tables-only.sql (npm run db:migrate:engraving).
--   * orders gains subtotal_amount, discount_amount, shipping_amount, tax_amount and
--     coupon_code, so the one total_amount can be broken down. They are NULL on orders
--     placed before this existed.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS order_addresses (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type           VARCHAR(10) NOT NULL CHECK (type IN ('BILLING', 'SHIPPING')),
    full_name      VARCHAR(150) NOT NULL,
    company        VARCHAR(150) NULL,
    address_line1  VARCHAR(255) NOT NULL,
    address_line2  VARCHAR(255) NULL,
    city           VARCHAR(100) NOT NULL,
    state          VARCHAR(100) NULL,
    postal_code    VARCHAR(20) NULL,
    country        VARCHAR(100) NOT NULL,
    phone          VARCHAR(20) NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE order_addresses IS 'A frozen billing or shipping address captured at checkout. Never edited after creation.';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address_id UUID NULL REFERENCES order_addresses (id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address_id UUID NULL REFERENCES order_addresses (id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(12, 2) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_amount DECIMAL(12, 2) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12, 2) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(20) NULL;
COMMENT ON COLUMN orders.subtotal_amount IS 'Sum of the line totals, before discount, shipping and tax.';
COMMENT ON COLUMN orders.discount_amount IS 'What the coupon took off; 0 when none.';
COMMENT ON COLUMN orders.shipping_amount IS 'The shipping charge; 0 for free shipping or pickup.';
COMMENT ON COLUMN orders.tax_amount IS 'Tax added on top of the prices; NULL when prices already include tax.';
COMMENT ON COLUMN orders.coupon_code IS 'The coupon code applied to this order, if any.';

CREATE TABLE IF NOT EXISTS order_line_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id  UUID NULL REFERENCES products (id) ON DELETE SET NULL,
    variant_id  UUID NULL REFERENCES product_variants (id) ON DELETE SET NULL,
    title       VARCHAR(255) NOT NULL,
    sku         VARCHAR(100) NULL,
    unit_price  DECIMAL(12, 2) NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    line_total  DECIMAL(12, 2) NOT NULL,
    engraving_enabled   BOOLEAN NOT NULL DEFAULT false,
    engraving_text      VARCHAR(100) NULL,
    engraving_font_id   VARCHAR(60) NULL,
    engraving_font_name VARCHAR(60) NULL
);
COMMENT ON TABLE order_line_items IS 'One row per product/quantity purchased on an order.';
COMMENT ON COLUMN order_line_items.title IS 'Snapshot of the product title at purchase time, with the chosen options, e.g. Classic Gold Band (18K Yellow Gold, 7).';
COMMENT ON COLUMN order_line_items.unit_price IS 'Snapshot; independent of the current product price.';
CREATE INDEX IF NOT EXISTS order_line_items_order_id_idx ON order_line_items (order_id);
CREATE INDEX IF NOT EXISTS order_line_items_product_id_idx ON order_line_items (product_id);

CREATE TABLE IF NOT EXISTS payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    provider            VARCHAR(10) NOT NULL CHECK (provider IN ('stripe', 'paypal', 'razorpay', 'cod')),
    status              VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    amount              DECIMAL(12, 2) NOT NULL,
    provider_reference  VARCHAR(255) NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE payments IS 'One row per payment attempt/capture against an order.';
COMMENT ON COLUMN payments.provider_reference IS 'Gateway transaction id: the Stripe PaymentIntent id (pi_...).';
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_reference_key ON payments (provider, provider_reference) WHERE provider_reference IS NOT NULL;
