-- Coupons table only (subset of vouchers-coupons-database-schema.sql)
-- Used to back the Coupon CRUD operations without requiring the
-- coupon_redemptions (needs orders/customers tables) or coupon_settings
-- (separate Settings page) tables from the full schema.
-- Dialect: PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS coupons (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                 VARCHAR(20) NOT NULL,
    description          TEXT NULL,
    discount_type        VARCHAR(14) NOT NULL
                         CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')),
    discount_value       DECIMAL(12, 2) NULL,
    min_purchase_amount  DECIMAL(12, 2) NULL,
    usage_limit          INTEGER NULL,
    usage_count          INTEGER NOT NULL DEFAULT 0,
    one_per_customer     BOOLEAN NOT NULL DEFAULT true,
    status               VARCHAR(10) NOT NULL DEFAULT 'DRAFT'
                         CHECK (status IN ('ACTIVE', 'SCHEDULED', 'DRAFT', 'EXPIRED')),
    start_date           DATE NULL,
    end_date             DATE NULL,
    applies_to           VARCHAR(8) NOT NULL DEFAULT 'ALL'
                         CHECK (applies_to IN ('ALL', 'CATEGORY')),
    category_id          UUID NULL REFERENCES categories (id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT coupons_code_key UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS coupons_status_idx ON coupons (status);
CREATE INDEX IF NOT EXISTS coupons_category_id_idx ON coupons (category_id);
