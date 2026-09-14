-- Orders schema
-- Generated from docs/orders/orders-database-schema.md
-- Dialect: PostgreSQL
--
-- Notes:
--   * `order_line_items.product_id` / `.variant_id` reference the Categories /
--     Products catalog schema
--     (docs/category-product/category-product-catalog-database-schema.sql).
--     Create those tables first, or drop the FK constraints below if this
--     script runs standalone.
--   * `payments.payment_method_id` references `payment_methods`, defined in
--     the My Account schema (docs/my-account/my-account-database-schema.sql).
--     Create that table first, or drop the FK constraint if this script runs
--     standalone.
--   * This file defines `orders.id`, which `coupon_redemptions.order_id`
--     (docs/vouchers-coupons/vouchers-coupons-database-schema.sql) and
--     `gift_card_transactions.order_id`
--     (docs/gift-cards/gift-cards-database-schema.sql) already expect. Run
--     this script before those, or add those FK constraints afterward.
--   * `orders_settings` / `customers_settings` are defined in
--     docs/settings/settings-database-schema.sql and are not repeated here.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

-- =========================================================================
-- customers
-- =========================================================================
CREATE TABLE customers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    phone               VARCHAR(20) NULL,
    password_hash       VARCHAR(255) NULL,
    customer_group      VARCHAR(20) NOT NULL DEFAULT 'Retail'
                        CHECK (customer_group IN ('Retail', 'Wholesale', 'VIP')),
    loyalty_points      INTEGER NOT NULL DEFAULT 0,
    accepts_marketing   BOOLEAN NOT NULL DEFAULT false,
    is_guest            BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE customers IS 'The person an order is placed by; distinct from users (My Account schema), which models store admin/staff logins.';
COMMENT ON COLUMN customers.password_hash IS 'NULL for a guest-checkout row.';
COMMENT ON COLUMN customers.customer_group IS 'Mirrors customers_settings.default_customer_group.';
COMMENT ON COLUMN customers.is_guest IS 'true for a one-off row created because customers_settings.allow_guest_checkout is on.';

CREATE UNIQUE INDEX customers_email_key ON customers (email) WHERE is_guest = false;
CREATE INDEX customers_email_idx ON customers (email);

-- =========================================================================
-- order_addresses
-- =========================================================================
CREATE TABLE order_addresses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type            VARCHAR(10) NOT NULL
                    CHECK (type IN ('BILLING', 'SHIPPING')),
    full_name       VARCHAR(150) NOT NULL,
    company         VARCHAR(150) NULL,
    address_line1   VARCHAR(255) NOT NULL,
    address_line2   VARCHAR(255) NULL,
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NULL,
    postal_code     VARCHAR(20) NULL,
    country         VARCHAR(100) NOT NULL,
    phone           VARCHAR(20) NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE order_addresses IS 'A frozen billing or shipping address captured at checkout; never edited after creation.';

-- =========================================================================
-- orders
-- =========================================================================
CREATE TABLE orders (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number           VARCHAR(30) NOT NULL,
    customer_id            UUID NULL REFERENCES customers (id) ON DELETE SET NULL,
    customer_name          VARCHAR(150) NOT NULL,
    billing_address_id     UUID NULL REFERENCES order_addresses (id) ON DELETE SET NULL,
    shipping_address_id    UUID NULL REFERENCES order_addresses (id) ON DELETE SET NULL,
    status                 VARCHAR(10) NOT NULL DEFAULT 'Pending'
                           CHECK (status IN ('Pending', 'Processing', 'Completed', 'Cancelled')),
    payment_status         VARCHAR(10) NOT NULL DEFAULT 'Unpaid'
                           CHECK (payment_status IN ('Paid', 'Unpaid', 'Refunded')),
    total_amount           DECIMAL(12, 2) NOT NULL,
    currency               VARCHAR(3) NOT NULL DEFAULT 'INR',
    placed_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at           TIMESTAMPTZ NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT orders_order_number_key UNIQUE (order_number)
);
COMMENT ON TABLE orders IS 'Backs the All Orders / Pending / Processing / Completed / Cancelled listings.';
COMMENT ON COLUMN orders.order_number IS 'e.g. SMB-10504; the listing''s leading "#" is display-only, not stored.';
COMMENT ON COLUMN orders.customer_id IS 'Nullable so order history survives account deletion.';
COMMENT ON COLUMN orders.customer_name IS 'Snapshot shown in the listing''s Customer column.';
COMMENT ON COLUMN orders.status IS 'Default mirrors orders_settings.default_order_status.';
COMMENT ON COLUMN orders.payment_status IS 'Denormalized summary of this order''s payments rows.';
COMMENT ON COLUMN orders.total_amount IS 'Matches the listing''s Amount column; no stored subtotal/discount/shipping/tax breakdown today.';
COMMENT ON COLUMN orders.currency IS 'Defaults to INR to match the currency already used in the mock order data.';

CREATE INDEX orders_customer_id_idx ON orders (customer_id);
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_payment_status_idx ON orders (payment_status);

-- =========================================================================
-- order_line_items
-- =========================================================================
CREATE TABLE order_line_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id     UUID NULL REFERENCES products (id) ON DELETE SET NULL,
    variant_id     UUID NULL REFERENCES product_variants (id) ON DELETE SET NULL,
    title          VARCHAR(255) NOT NULL,
    sku            VARCHAR(100) NULL,
    unit_price     DECIMAL(12, 2) NOT NULL,
    quantity       INTEGER NOT NULL DEFAULT 1,
    line_total     DECIMAL(12, 2) NOT NULL
);
COMMENT ON TABLE order_line_items IS 'One row per product/quantity purchased on an order. Backs the listing''s Products count via COUNT/SUM at read time.';
COMMENT ON COLUMN order_line_items.title IS 'Snapshot of products.title at purchase time.';
COMMENT ON COLUMN order_line_items.unit_price IS 'Snapshot; independent of the current product price.';
COMMENT ON COLUMN order_line_items.line_total IS 'unit_price * quantity at purchase time.';

CREATE INDEX order_line_items_order_id_idx ON order_line_items (order_id);
CREATE INDEX order_line_items_product_id_idx ON order_line_items (product_id);

-- =========================================================================
-- payments
-- =========================================================================
CREATE TABLE payments (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id             UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    payment_method_id    UUID NULL REFERENCES payment_methods (id) ON DELETE SET NULL,
    provider             VARCHAR(10) NOT NULL
                         CHECK (provider IN ('stripe', 'paypal', 'razorpay', 'cod')),
    status               VARCHAR(10) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    amount               DECIMAL(12, 2) NOT NULL,
    provider_reference   VARCHAR(255) NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE payments IS 'One row per payment attempt/capture against an order.';
COMMENT ON COLUMN payments.payment_method_id IS 'The saved card used, if any (My Account schema).';
COMMENT ON COLUMN payments.provider IS 'Mirrors the four gateways toggled on payment_settings.';
COMMENT ON COLUMN payments.provider_reference IS 'Gateway charge/transaction id.';

CREATE INDEX payments_order_id_idx ON payments (order_id);
