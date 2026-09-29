-- Adds 'Failed' to the existing orders.payment_status CHECK constraint.
-- Additive migration for an already-migrated `orders` table (see
-- orders-table-only.sql) — run once against an environment that already has
-- the orders table, so Reports' "Failed Payments" stat is a real column
-- value instead of an unsupported one.
-- Dialect: PostgreSQL

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('Paid', 'Unpaid', 'Refunded', 'Failed'));
