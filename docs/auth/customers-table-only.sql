-- Customers table only (subset of orders-database-schema.sql)
-- Used to back Registration/Login/Logout/Forgot-Password without requiring
-- the order_addresses/orders/order_line_items/payments tables from the full
-- Orders schema.
-- Dialect: PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS customers (
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
    terms_accepted_at   TIMESTAMPTZ NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE customers IS 'The person an order is placed by; distinct from users (My Account schema), which models store admin/staff logins.';
COMMENT ON COLUMN customers.password_hash IS 'NULL for a guest-checkout row.';
COMMENT ON COLUMN customers.customer_group IS 'Mirrors customers_settings.default_customer_group.';
COMMENT ON COLUMN customers.is_guest IS 'true for a one-off row created because customers_settings.allow_guest_checkout is on.';
COMMENT ON COLUMN customers.terms_accepted_at IS 'Set when Register''s "I agree to the Terms of Service and Privacy Policy" checkbox is submitted; flagged as a follow-up in auth-database-schema.md.';

CREATE UNIQUE INDEX IF NOT EXISTS customers_email_key ON customers (email) WHERE is_guest = false;
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers (email);
