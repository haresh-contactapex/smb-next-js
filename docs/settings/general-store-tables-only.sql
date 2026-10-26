-- General and Store settings tables only (subset of settings-database-schema.sql)
-- Back the Settings -> General and Settings -> Store pages without the rest of the full
-- Settings schema, whose CREATE TABLE statements cannot be re-run.
-- Apply with: npm run db:migrate:general-store
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS general_settings (
    id               SMALLINT PRIMARY KEY CHECK (id = 1),
    store_name       VARCHAR(150) NOT NULL DEFAULT 'Shop My Band',
    logo_url         TEXT,
    favicon_url      TEXT,
    store_email      VARCHAR(255) NOT NULL DEFAULT 'hello@shopmyband.com',
    phone            VARCHAR(20),
    address          VARCHAR(255),
    country          VARCHAR(100) NOT NULL DEFAULT 'United States',
    state            VARCHAR(100),
    city             VARCHAR(100),
    timezone         VARCHAR(20)  NOT NULL DEFAULT 'UTC+05:30',
    date_time_format VARCHAR(20)  NOT NULL DEFAULT 'MM/DD/YYYY 12h',
    language         VARCHAR(5)   NOT NULL DEFAULT 'en',
    currency         VARCHAR(3)   NOT NULL DEFAULT 'USD',
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE general_settings IS 'Backs the Settings -> General page. Singleton row (id = 1).';

-- ----------------------------------------------------------------------------
-- Store
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_settings (
    id                  SMALLINT PRIMARY KEY CHECK (id = 1),
    legal_business_name VARCHAR(200),
    business_type       VARCHAR(20) NOT NULL DEFAULT 'LLC'
        CHECK (business_type IN ('Sole Proprietorship', 'LLC', 'Corporation', 'Partnership', 'Other')),
    store_url           VARCHAR(255),
    tax_id              VARCHAR(50),
    support_email       VARCHAR(255),
    support_phone       VARCHAR(20),
    support_hours       VARCHAR(100),
    store_is_live       BOOLEAN NOT NULL DEFAULT true,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE store_settings IS 'Backs the Settings -> Store page. Singleton row (id = 1).';
COMMENT ON COLUMN store_settings.store_is_live IS 'Storefront on/off switch.';

-- The singleton rows the pages read; kept if they already exist.
INSERT INTO general_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
