-- Shipping settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> Shipping page without requiring the other
-- settings tables from the full Settings schema.
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS shipping_settings (
    id                       SMALLINT PRIMARY KEY CHECK (id = 1),
    default_carrier          VARCHAR(20) NOT NULL DEFAULT 'USPS'
        CHECK (default_carrier IN ('USPS', 'UPS', 'FedEx', 'DHL', 'Local Courier')),
    flat_rate_fee            DECIMAL(12,2) NOT NULL DEFAULT 5.99,
    free_shipping_threshold  DECIMAL(12,2) NOT NULL DEFAULT 75,
    processing_time_days     SMALLINT      NOT NULL DEFAULT 2,
    weight_unit              VARCHAR(2)    NOT NULL DEFAULT 'lb'
        CHECK (weight_unit IN ('lb', 'kg', 'g', 'oz')),
    dimension_unit           VARCHAR(2)    NOT NULL DEFAULT 'in'
        CHECK (dimension_unit IN ('in', 'cm')),
    local_pickup_enabled     BOOLEAN       NOT NULL DEFAULT false,
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON TABLE shipping_settings IS 'Backs the Settings -> Shipping page. Singleton row (id = 1).';
COMMENT ON COLUMN shipping_settings.free_shipping_threshold IS 'Order subtotal at/above which shipping is free.';
COMMENT ON COLUMN shipping_settings.weight_unit IS 'Defaults to, and is kept in sync with, products_settings.default_weight_unit whenever Settings -> Products is saved.';

-- Re-running this file against an environment migrated before 'g' and 'oz'
-- were added to the weight unit choices widens the constraint without
-- losing the existing row.
ALTER TABLE shipping_settings DROP CONSTRAINT IF EXISTS shipping_settings_weight_unit_check;
ALTER TABLE shipping_settings ADD CONSTRAINT shipping_settings_weight_unit_check
    CHECK (weight_unit IN ('lb', 'kg', 'g', 'oz'));

INSERT INTO shipping_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
