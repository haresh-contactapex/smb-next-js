-- Notifications settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> Notifications page without requiring the other
-- settings tables from the full Settings schema.
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS notifications_settings (
    id                           SMALLINT PRIMARY KEY CHECK (id = 1),
    new_order_email_alert        BOOLEAN     NOT NULL DEFAULT true,
    low_stock_alert              BOOLEAN     NOT NULL DEFAULT true,
    new_customer_signup_alert    BOOLEAN     NOT NULL DEFAULT false,
    notification_recipient_email VARCHAR(255) NOT NULL DEFAULT 'admin@shopmyband.com',
    enable_sms_notifications     BOOLEAN     NOT NULL DEFAULT false,
    enable_push_notifications    BOOLEAN     NOT NULL DEFAULT false,
    toast_timeout_seconds        SMALLINT    NOT NULL DEFAULT 3 CHECK (toast_timeout_seconds BETWEEN 1 AND 30),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE notifications_settings IS 'Backs the Settings -> Notifications page. Singleton row (id = 1).';
COMMENT ON COLUMN notifications_settings.notification_recipient_email IS 'Where the alerts above are sent.';
COMMENT ON COLUMN notifications_settings.toast_timeout_seconds IS 'How long admin toast notifications stay visible before auto-dismissing. 1-30 seconds.';

INSERT INTO notifications_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
