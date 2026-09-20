-- Products settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> Products page without requiring the other
-- settings tables from the full Settings schema.
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS products_settings (
    id                   SMALLINT PRIMARY KEY CHECK (id = 1),
    sku_prefix           VARCHAR(20),
    default_status       VARCHAR(10) NOT NULL DEFAULT 'draft'
        CHECK (default_status IN ('draft', 'published')),
    default_weight_unit  VARCHAR(2)  NOT NULL DEFAULT 'lb'
        CHECK (default_weight_unit IN ('lb', 'kg')),
    allow_backorders     BOOLEAN     NOT NULL DEFAULT false,
    allow_reviews        BOOLEAN     NOT NULL DEFAULT true,
    show_low_stock_badge BOOLEAN     NOT NULL DEFAULT true,
    low_stock_threshold  INTEGER     NOT NULL DEFAULT 5,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE products_settings IS 'Backs the Settings -> Products page. Singleton row (id = 1).';
COMMENT ON COLUMN products_settings.default_status IS 'Status a new product is created with.';
COMMENT ON COLUMN products_settings.low_stock_threshold IS 'Duplicated on inventory_settings; two independent forms in the current UI.';

INSERT INTO products_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
