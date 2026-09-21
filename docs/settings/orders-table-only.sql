-- Orders settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> Orders page without requiring the other
-- settings tables from the full Settings schema.
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS orders_settings (
    id                        SMALLINT PRIMARY KEY CHECK (id = 1),
    order_number_prefix       VARCHAR(20) NOT NULL DEFAULT 'SMB-',
    starting_order_number     INTEGER     NOT NULL DEFAULT 10000,
    auto_cancel_hours         SMALLINT    NOT NULL DEFAULT 24 CHECK (auto_cancel_hours >= 24),
    default_order_status      VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (default_order_status IN ('Pending', 'Processing', 'Completed')),
    require_confirmation_email BOOLEAN    NOT NULL DEFAULT true,
    allow_order_edits         BOOLEAN     NOT NULL DEFAULT false,
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE orders_settings IS 'Backs the Settings -> Orders page. Singleton row (id = 1).';
COMMENT ON COLUMN orders_settings.starting_order_number IS 'Seed value for the next generated order number.';
COMMENT ON COLUMN orders_settings.auto_cancel_hours IS 'Auto-cancel unpaid orders after this many hours. Minimum 24.';
COMMENT ON COLUMN orders_settings.allow_order_edits IS 'Whether admins can edit an order after it''s placed.';

INSERT INTO orders_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
