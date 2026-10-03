-- Adds one switch per order status email to email_settings (Settings -> Email):
-- Processing, Cancelled and Failed. The Completed order email is controlled by the existing
-- send_shipping_notification_emails column (shown as "Send completed order emails").
-- Safe to run more than once. Run it against an environment that already has email_settings
-- (docs/settings/email-table-only.sql); a fresh one gets these columns from that file.
-- Dialect: PostgreSQL

ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS send_processing_order_emails BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS send_cancelled_order_emails  BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS send_failed_order_emails     BOOLEAN NOT NULL DEFAULT true;
