-- Payment settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> Payment page without requiring the other
-- settings tables from the full Settings schema.
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS payment_settings (
    id               SMALLINT PRIMARY KEY CHECK (id = 1),
    stripe_enabled   BOOLEAN       NOT NULL DEFAULT true,
    paypal_enabled   BOOLEAN       NOT NULL DEFAULT false,
    razorpay_enabled BOOLEAN       NOT NULL DEFAULT false,
    cod_enabled      BOOLEAN       NOT NULL DEFAULT true,
    public_key       VARCHAR(255),
    secret_key       VARCHAR(255),
    transaction_fee  DECIMAL(5,2)  NOT NULL DEFAULT 2.9,
    cod_min_order    DECIMAL(12,2) NOT NULL DEFAULT 0,
    auto_capture     BOOLEAN       NOT NULL DEFAULT true,
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON TABLE payment_settings IS 'Backs the Settings -> Payment page. Singleton row (id = 1).';
COMMENT ON COLUMN payment_settings.cod_enabled IS 'Cash on delivery.';
COMMENT ON COLUMN payment_settings.public_key IS 'Gateway publishable key.';
COMMENT ON COLUMN payment_settings.secret_key IS 'Gateway secret key. Stored as plain text, like the integrations_settings secrets today; encrypt at rest before going live.';
COMMENT ON COLUMN payment_settings.transaction_fee IS 'Percent per transaction.';
COMMENT ON COLUMN payment_settings.cod_min_order IS 'Minimum order amount to allow COD.';
COMMENT ON COLUMN payment_settings.auto_capture IS 'Capture payment immediately vs. authorize-only.';

INSERT INTO payment_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
