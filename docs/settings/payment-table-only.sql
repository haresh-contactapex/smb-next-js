-- Payment settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> Payment page without requiring the other
-- settings tables from the full Settings schema.
-- Dialect: PostgreSQL
--
-- For a database whose payment_settings table was created before per-gateway
-- credentials existed (it still has the shared public_key / secret_key
-- columns), run payment-gateway-credentials-only.sql instead of this file.

CREATE TABLE IF NOT EXISTS payment_settings (
    id                     SMALLINT PRIMARY KEY CHECK (id = 1),
    stripe_enabled         BOOLEAN       NOT NULL DEFAULT true,
    paypal_enabled         BOOLEAN       NOT NULL DEFAULT false,
    razorpay_enabled       BOOLEAN       NOT NULL DEFAULT false,
    cod_enabled            BOOLEAN       NOT NULL DEFAULT true,
    stripe_publishable_key VARCHAR(255),
    stripe_secret_key      VARCHAR(255),
    paypal_client_id       VARCHAR(255),
    paypal_client_secret   VARCHAR(255),
    paypal_environment     VARCHAR(10)   NOT NULL DEFAULT 'sandbox' CHECK (paypal_environment IN ('sandbox', 'live')),
    razorpay_key_id        VARCHAR(255),
    razorpay_key_secret    VARCHAR(255),
    transaction_fee        DECIMAL(5,2)  NOT NULL DEFAULT 2.9,
    cod_min_order          DECIMAL(12,2) NOT NULL DEFAULT 0,
    auto_capture           BOOLEAN       NOT NULL DEFAULT true,
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON TABLE payment_settings IS 'Backs the Settings -> Payment page. Singleton row (id = 1). At most one of stripe_enabled / paypal_enabled / razorpay_enabled is true, and at least one of those or cod_enabled is true; both rules are enforced by the API, not the database.';
COMMENT ON COLUMN payment_settings.cod_enabled IS 'Cash on delivery. May be on alone or alongside the one active online gateway.';
COMMENT ON COLUMN payment_settings.stripe_publishable_key IS 'Stripe publishable key. Kept when Stripe is switched off.';
COMMENT ON COLUMN payment_settings.stripe_secret_key IS 'Stripe secret key. Stored as plain text, like the integrations_settings secrets today; encrypt at rest before going live.';
COMMENT ON COLUMN payment_settings.paypal_client_id IS 'PayPal REST app client ID. Kept when PayPal is switched off.';
COMMENT ON COLUMN payment_settings.paypal_client_secret IS 'PayPal REST app client secret. Stored as plain text; encrypt at rest before going live.';
COMMENT ON COLUMN payment_settings.paypal_environment IS 'Which PayPal environment the client ID and secret belong to: sandbox or live.';
COMMENT ON COLUMN payment_settings.razorpay_key_id IS 'Razorpay key ID. Kept when Razorpay is switched off.';
COMMENT ON COLUMN payment_settings.razorpay_key_secret IS 'Razorpay key secret. Stored as plain text; encrypt at rest before going live.';
COMMENT ON COLUMN payment_settings.transaction_fee IS 'Percent per transaction.';
COMMENT ON COLUMN payment_settings.cod_min_order IS 'Minimum order amount to allow COD.';
COMMENT ON COLUMN payment_settings.auto_capture IS 'Capture payment immediately vs. authorize-only.';

INSERT INTO payment_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
