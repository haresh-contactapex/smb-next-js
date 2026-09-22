-- System & Maintenance settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> System & Maintenance page without requiring the
-- other settings tables from the full Settings schema.
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS system_maintenance_settings (
    id                        SMALLINT PRIMARY KEY CHECK (id = 1),
    maintenance_mode_enabled BOOLEAN     NOT NULL DEFAULT false,
    maintenance_message      TEXT,
    debug_mode_enabled       BOOLEAN     NOT NULL DEFAULT false,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE system_maintenance_settings IS 'Backs the Settings -> System & Maintenance page. Excludes read-only System Info and the Back Up Now / Clear Cache actions. Singleton row (id = 1).';
COMMENT ON COLUMN system_maintenance_settings.maintenance_message IS 'Shown to storefront visitors while maintenance mode is on.';

INSERT INTO system_maintenance_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
