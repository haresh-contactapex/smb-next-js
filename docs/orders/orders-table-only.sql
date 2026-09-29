-- Orders table only (subset of orders-database-schema.sql)
-- Backs the All Orders / Pending / Processing / Completed / Cancelled
-- listings without requiring the order_addresses/order_line_items/payments
-- tables from the full Orders schema — same "table-only" pattern as
-- docs/auth/customers-table-only.sql and docs/vouchers-coupons/coupons-table-only.sql.
-- Dialect: PostgreSQL
--
-- Notes:
--   * customer_id references the customers table already created by
--     docs/auth/customers-table-only.sql — this file does not redefine it.
--   * item_count and total_amount are denormalized here (no order_line_items
--     table yet) so the listing's "Products"/"Amount" columns don't need a
--     join; see the Design notes in orders-database-schema.md for the fuller,
--     line-item-backed version this can graduate to later.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number      VARCHAR(30) NOT NULL,
    customer_id       UUID NULL REFERENCES customers (id) ON DELETE SET NULL,
    customer_name     VARCHAR(150) NOT NULL,
    item_count        INTEGER NOT NULL DEFAULT 1,
    total_amount      DECIMAL(12, 2) NOT NULL,
    currency          VARCHAR(3) NOT NULL DEFAULT 'INR',
    status            VARCHAR(10) NOT NULL DEFAULT 'Pending'
                      CHECK (status IN ('Pending', 'Processing', 'Completed', 'Cancelled')),
    payment_status    VARCHAR(10) NOT NULL DEFAULT 'Unpaid'
                      CHECK (payment_status IN ('Paid', 'Unpaid', 'Refunded', 'Failed')),
    placed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at      TIMESTAMPTZ NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT orders_order_number_key UNIQUE (order_number)
);
COMMENT ON TABLE orders IS 'Backs the All Orders / Pending / Processing / Completed / Cancelled listings.';
COMMENT ON COLUMN orders.order_number IS 'e.g. SMB-10504; the listing''s leading "#" is display-only, not stored.';
COMMENT ON COLUMN orders.customer_name IS 'Snapshot shown in the listing''s Customer column.';
COMMENT ON COLUMN orders.item_count IS 'Denormalized product-line count for this table-only variant; the full schema computes it from order_line_items instead.';
COMMENT ON COLUMN orders.payment_status IS 'Denormalized payment summary for this table-only variant; the full schema derives it from payments instead.';

CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON orders (payment_status);
