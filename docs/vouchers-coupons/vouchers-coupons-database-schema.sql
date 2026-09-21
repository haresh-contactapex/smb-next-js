-- Vouchers / Coupons schema
-- Generated from docs/vouchers-coupons/vouchers-coupons-database-schema.md
-- Dialect: PostgreSQL
--
-- Notes:
--   * `coupons.category_id` references `categories`, defined in the
--     Categories / Products catalog schema
--     (docs/category-product/category-product-catalog-database-schema.sql).
--     Create that table first, or drop the FK constraint below if this
--     script runs standalone.
--   * `coupon_redemptions.order_id` and `.customer_id` reference an Orders
--     module and a customer/account entity that are not yet formalized in
--     any schema doc in this repo. Create stub `orders(id)` / `customers(id)`
--     tables first, or drop those FK constraints if this script runs
--     standalone.
--   * `coupon_settings` is a singleton: exactly one row
--     (id SMALLINT PRIMARY KEY CHECK (id = 1)) holding the whole Discounts &
--     Coupons settings page — the same pattern used throughout
--     docs/settings/settings-database-schema.sql (which explicitly excludes
--     this table and defers to this file instead).

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

-- =========================================================================
-- coupons
-- =========================================================================
CREATE TABLE coupons (
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
COMMENT ON TABLE coupons IS 'Backs the All Coupons listing and the Create Coupon form.';
COMMENT ON COLUMN coupons.code IS 'Uppercase A-Z0-9 only (formatCode); "Generate" fills a random one.';
COMMENT ON COLUMN coupons.discount_value IS 'Percentage points or a currency amount; NULL when discount_type = ''free_shipping''.';
COMMENT ON COLUMN coupons.usage_limit IS 'NULL = unlimited.';
COMMENT ON COLUMN coupons.usage_count IS 'Denormalized redemption counter; see coupon_redemptions.';
COMMENT ON COLUMN coupons.status IS 'Set directly by the admin (ACTIVE/SCHEDULED/DRAFT), except EXPIRED: an ACTIVE or SCHEDULED coupon is lazily flipped to EXPIRED once end_date has passed (see expireOverdueCoupons in src/lib/coupons.js).';
COMMENT ON COLUMN coupons.end_date IS 'NULL = runs indefinitely (''Set an end date'' left unchecked).';
COMMENT ON COLUMN coupons.category_id IS 'Set only when applies_to = ''CATEGORY''.';

CREATE INDEX coupons_status_idx ON coupons (status);
CREATE INDEX coupons_category_id_idx ON coupons (category_id);

-- =========================================================================
-- coupon_redemptions
-- =========================================================================
CREATE TABLE coupon_redemptions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id        UUID NOT NULL REFERENCES coupons (id) ON DELETE CASCADE,
    order_id         UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    customer_id      UUID NULL REFERENCES customers (id) ON DELETE SET NULL,
    discount_amount  DECIMAL(12, 2) NOT NULL,
    redeemed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE coupon_redemptions IS 'One row per successful use of a coupon on an order. Enforces usage_limit / one_per_customer at checkout and audits discount_amount granted.';
COMMENT ON COLUMN coupon_redemptions.discount_amount IS 'Currency amount actually deducted from that order at redemption time.';

CREATE INDEX coupon_redemptions_coupon_id_idx ON coupon_redemptions (coupon_id);
CREATE INDEX coupon_redemptions_coupon_id_customer_id_idx ON coupon_redemptions (coupon_id, customer_id);

-- =========================================================================
-- coupon_settings
-- =========================================================================
CREATE TABLE coupon_settings (
    id                            SMALLINT PRIMARY KEY CHECK (id = 1),
    coupons_enabled                BOOLEAN NOT NULL DEFAULT true,
    allow_multiple_coupons         BOOLEAN NOT NULL DEFAULT false,
    max_discount_percent           DECIMAL(5, 2) NOT NULL DEFAULT 50,
    case_sensitive_coupons         BOOLEAN NOT NULL DEFAULT false,
    auto_apply_best_discount       BOOLEAN NOT NULL DEFAULT true,
    min_order_amount_for_coupon    DECIMAL(12, 2) NOT NULL DEFAULT 0,
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE coupon_settings IS 'Backs the Settings -> Discounts & Coupons page. Singleton row (id = 1).';
COMMENT ON COLUMN coupon_settings.coupons_enabled IS 'Site-wide kill switch: when false, every coupon''s redemption path should be rejected at checkout regardless of that coupon''s own status.';
COMMENT ON COLUMN coupon_settings.max_discount_percent IS 'Upper bound applied when auto_apply_best_discount would otherwise exceed it.';

-- Seed the singleton row so the settings page has a row to read/update from
-- the moment the app starts (same convention as settings-database-schema.sql).
INSERT INTO coupon_settings (id) VALUES (1);
