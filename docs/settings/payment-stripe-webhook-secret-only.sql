-- Adds the Stripe webhook signing secret to payment_settings, so it is saved in
-- Settings -> Payment with the other Stripe keys instead of in an environment variable.
-- One-off migration for a database whose payment_settings table was created before this
-- column existed; databases created from the current payment-table-only.sql already have it.
-- Safe to run more than once.
-- Dialect: PostgreSQL

ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS stripe_webhook_secret VARCHAR(255);
COMMENT ON COLUMN payment_settings.stripe_webhook_secret IS 'Signing secret (whsec_...) of the Stripe webhook that points at /api/stripe/webhook; it verifies that webhook events really come from Stripe. Kept when Stripe is switched off. Stored as plain text; encrypt at rest before going live.';
