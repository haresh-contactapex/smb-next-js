-- Currency & Tax settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> Currency & Tax page without requiring the other
-- settings tables from the full Settings schema.
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS currency_tax_settings (
    id                       SMALLINT PRIMARY KEY CHECK (id = 1),
    currency                 VARCHAR(3)   NOT NULL DEFAULT 'USD',
    currency_position        VARCHAR(6)   NOT NULL DEFAULT 'before'
        CHECK (currency_position IN ('before', 'after')),
    number_format            VARCHAR(10)  NOT NULL DEFAULT '1,234.56'
        CHECK (number_format IN ('1,234.56', '1.234,56', '1 234.56')),
    prices_include_tax       BOOLEAN      NOT NULL DEFAULT false,
    default_tax_rate         DECIMAL(5,2) NOT NULL DEFAULT 8.25,
    tax_registration_number  VARCHAR(50),
    apply_tax_to_shipping    BOOLEAN      NOT NULL DEFAULT true,
    enable_tax_exempt_groups BOOLEAN      NOT NULL DEFAULT false,
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE currency_tax_settings IS 'Backs the Settings -> Currency & Tax page. Singleton row (id = 1).';
COMMENT ON COLUMN currency_tax_settings.currency IS 'The store-wide currency, applied globally across the app. general_settings.currency is unused.';

INSERT INTO currency_tax_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
