-- Pricing settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> Pricing page without requiring the other
-- settings tables from the full Settings schema.
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS pricing_settings (
    id                     SMALLINT PRIMARY KEY CHECK (id = 1),
    adjustment_value       NUMERIC(10, 2) NOT NULL DEFAULT 0
        CHECK (adjustment_value >= 0),
    adjustment_type        VARCHAR(10) NOT NULL DEFAULT 'percentage'
        CHECK (adjustment_type IN ('percentage', 'fixed')),
    adjustment_direction   VARCHAR(10) NOT NULL DEFAULT 'increase'
        CHECK (adjustment_direction IN ('increase', 'decrease')),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE pricing_settings IS 'Backs the Settings -> Pricing page. Singleton row (id = 1).';
COMMENT ON COLUMN pricing_settings.adjustment_value IS 'Magnitude of the price adjustment; interpreted as a percentage or a fixed currency amount depending on adjustment_type.';
COMMENT ON COLUMN pricing_settings.adjustment_type IS 'Whether adjustment_value is a percentage of the product price or a fixed amount.';
COMMENT ON COLUMN pricing_settings.adjustment_direction IS 'Whether the adjustment raises or lowers the product price.';

INSERT INTO pricing_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
