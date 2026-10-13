-- Adds the customer's order note to the orders table.
-- Additive migration for an already-migrated `orders` table (see
-- orders-table-only.sql and order-details-tables-only.sql). The cart's "Order
-- note" box ("Special instructions, gift message or ring size", up to 500
-- characters) is sent with Place Order and kept here, so it can be shown on the
-- order confirmation page, the customer's order page and the admin order pages.
-- Nullable and with no default: an order placed without a note, or before this
-- existed, has NULL, and the running site ignores the column until it is deployed.
-- Safe to run more than once.
-- Dialect: PostgreSQL

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_note TEXT NULL;
COMMENT ON COLUMN orders.customer_note IS 'The note the customer wrote in the cart (special instructions, gift message, ring size), at most 500 characters; NULL when there is none. Plain text, never HTML.';
