-- Integrations settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> Integrations page without requiring the other
-- settings tables from the full Settings schema.
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS integrations_settings (
    id                        SMALLINT PRIMARY KEY CHECK (id = 1),
    google_analytics_enabled  BOOLEAN     NOT NULL DEFAULT true,
    google_analytics_id       VARCHAR(30),
    meta_pixel_enabled        BOOLEAN     NOT NULL DEFAULT false,
    meta_pixel_id             VARCHAR(30),
    mailchimp_enabled         BOOLEAN     NOT NULL DEFAULT false,
    mailchimp_api_key         VARCHAR(255),
    google_recaptcha_enabled    BOOLEAN     NOT NULL DEFAULT false,
    google_recaptcha_site_key   VARCHAR(255),
    google_recaptcha_secret_key VARCHAR(255),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE integrations_settings IS 'Backs the Settings -> Integrations page. Singleton row (id = 1).';
COMMENT ON COLUMN integrations_settings.google_analytics_id IS 'Measurement ID, e.g. G-XXXXXXXXXX. Required when google_analytics_enabled is true.';
COMMENT ON COLUMN integrations_settings.meta_pixel_id IS 'Numeric Pixel ID. Required when meta_pixel_enabled is true.';
COMMENT ON COLUMN integrations_settings.mailchimp_api_key IS 'Mailchimp API key, e.g. {32 hex chars}-us21. Required when mailchimp_enabled is true.';
COMMENT ON COLUMN integrations_settings.google_recaptcha_site_key IS 'Google reCAPTCHA site key. Required when google_recaptcha_enabled is true.';
COMMENT ON COLUMN integrations_settings.google_recaptcha_secret_key IS 'Google reCAPTCHA secret key, used server-side to verify challenge responses. Required when google_recaptcha_enabled is true; should be stored encrypted, not plaintext.';

INSERT INTO integrations_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
