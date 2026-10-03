-- Checkout settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> Checkout page without requiring the other
-- settings tables from the full Settings schema.
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS checkout_settings (
    id                         SMALLINT PRIMARY KEY CHECK (id = 1),
    allow_guest_checkout       BOOLEAN       NOT NULL DEFAULT true,
    require_phone              BOOLEAN       NOT NULL DEFAULT false,
    require_terms              BOOLEAN       NOT NULL DEFAULT true,
    minimum_order_amount       DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (minimum_order_amount >= 0),
    send_abandoned_cart_emails BOOLEAN       NOT NULL DEFAULT true,
    reminder_delay_hours       SMALLINT      NOT NULL DEFAULT 4 CHECK (reminder_delay_hours >= 1),
    updated_at                 TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON TABLE checkout_settings IS 'Backs the Settings -> Checkout page. Singleton row (id = 1).';
COMMENT ON COLUMN checkout_settings.allow_guest_checkout IS 'When false the storefront checkout requires a signed-in customer; the server refuses guest orders too.';
COMMENT ON COLUMN checkout_settings.reminder_delay_hours IS 'Delay before the first abandoned-cart email.';

INSERT INTO checkout_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
