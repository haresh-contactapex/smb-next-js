-- Customer account tables (back the storefront /account dashboard)
-- Apply with: npm run db:migrate:account
-- Requires customers (npm run db:migrate:customers). Dialect: PostgreSQL
--
-- Notes:
--   * Distinct from `addresses` / `payment_methods` in docs/my-account, which
--     belong to staff `users` for the admin panel's My Account pages. These
--     belong to storefront `customers`; the two identities never share rows.
--   * customer_payment_methods holds display metadata only (brand, last four
--     digits, expiry, name). The full card number and CVV are never sent to or
--     stored by this app. provider / provider_token are reserved for the
--     payment gateway's own token once card capture goes through the gateway.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

-- =========================================================================
-- customer_addresses
-- =========================================================================
CREATE TABLE IF NOT EXISTS customer_addresses (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id             UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    label                   VARCHAR(40) NOT NULL DEFAULT 'Home',
    full_name               VARCHAR(150) NOT NULL,
    company                 VARCHAR(150) NULL,
    phone                   VARCHAR(20) NULL,
    address_line1           VARCHAR(255) NOT NULL,
    address_line2           VARCHAR(255) NULL,
    city                    VARCHAR(100) NOT NULL,
    state                   VARCHAR(100) NOT NULL,
    postal_code             VARCHAR(20) NULL,
    country                 VARCHAR(100) NOT NULL,
    delivery_instructions   VARCHAR(500) NULL,
    is_default_shipping     BOOLEAN NOT NULL DEFAULT false,
    is_default_billing      BOOLEAN NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE customer_addresses IS 'A customer''s address book. Many rows per customer; an order copies the address it uses, so editing or deleting a row never changes past orders.';
COMMENT ON COLUMN customer_addresses.label IS 'Short name the customer gives the address, e.g. Home or Work.';
COMMENT ON COLUMN customer_addresses.is_default_shipping IS 'At most one row per customer is true (partial unique index below).';
COMMENT ON COLUMN customer_addresses.is_default_billing IS 'At most one row per customer is true (partial unique index below).';

CREATE INDEX IF NOT EXISTS customer_addresses_customer_idx ON customer_addresses (customer_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_default_shipping_key ON customer_addresses (customer_id) WHERE is_default_shipping;
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_default_billing_key ON customer_addresses (customer_id) WHERE is_default_billing;

-- =========================================================================
-- customer_payment_methods
-- =========================================================================
CREATE TABLE IF NOT EXISTS customer_payment_methods (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id           UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    brand                 VARCHAR(20) NOT NULL
                          CHECK (brand IN ('visa', 'mastercard', 'amex', 'discover', 'diners', 'jcb', 'other')),
    last4                 CHAR(4) NOT NULL,
    exp_month             SMALLINT NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
    exp_year              SMALLINT NOT NULL CHECK (exp_year BETWEEN 2000 AND 2100),
    holder_name           VARCHAR(150) NOT NULL,
    nickname              VARCHAR(40) NULL,
    billing_address_id    UUID NULL REFERENCES customer_addresses (id) ON DELETE SET NULL,
    is_default            BOOLEAN NOT NULL DEFAULT false,
    provider              VARCHAR(10) NULL
                          CHECK (provider IN ('stripe', 'razorpay', 'paypal')),
    provider_token        VARCHAR(255) NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE customer_payment_methods IS 'Saved cards, as display metadata only. Never holds a full card number or CVV.';
COMMENT ON COLUMN customer_payment_methods.last4 IS 'Last four digits of the card number, for display.';
COMMENT ON COLUMN customer_payment_methods.provider_token IS 'Reserved for the gateway''s own reusable token. NULL until card capture goes through the gateway, so a card here cannot be charged yet.';
COMMENT ON COLUMN customer_payment_methods.billing_address_id IS 'Optional address-book entry used as this card''s billing address; cleared if that address is deleted.';

CREATE INDEX IF NOT EXISTS customer_payment_methods_customer_idx ON customer_payment_methods (customer_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS customer_payment_methods_default_key ON customer_payment_methods (customer_id) WHERE is_default;
CREATE UNIQUE INDEX IF NOT EXISTS customer_payment_methods_card_key
    ON customer_payment_methods (customer_id, brand, last4, exp_month, exp_year);
