-- Email settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> Email page without requiring the other
-- settings tables from the full Settings schema.
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS email_settings (
    id                                 SMALLINT PRIMARY KEY CHECK (id = 1),
    smtp_host                          VARCHAR(255),
    smtp_port                          INTEGER CHECK (smtp_port BETWEEN 1 AND 65535),
    smtp_username                      VARCHAR(255),
    smtp_password                      VARCHAR(255),
    sender_name                        VARCHAR(150),
    sender_email                       VARCHAR(255),
    send_order_confirmation_emails     BOOLEAN     NOT NULL DEFAULT true,
    send_shipping_notification_emails  BOOLEAN     NOT NULL DEFAULT true,
    send_marketing_emails              BOOLEAN     NOT NULL DEFAULT false,
    email_footer_text                  TEXT,
    updated_at                         TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE email_settings IS 'Backs the Settings -> Email page. Singleton row (id = 1).';
COMMENT ON COLUMN email_settings.smtp_port IS 'SMTP server port, 1-65535 (typically 25, 465 or 587).';
COMMENT ON COLUMN email_settings.smtp_password IS 'Write-only from the admin UI: the API never returns it, and a blank value on save keeps the stored password. Should be stored encrypted, not plaintext.';

INSERT INTO email_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
