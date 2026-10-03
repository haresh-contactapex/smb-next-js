-- Replaces the shared payment_settings.public_key / secret_key pair with
-- per-gateway credential columns (Stripe, PayPal, Razorpay).
-- One-off migration for a database that already has the payment_settings table
-- from the earlier payment-table-only.sql. Run it once; databases created from
-- the current payment-table-only.sql already have these columns and no legacy
-- ones, so on them the copy step below fails because public_key is gone.
-- Dialect: PostgreSQL
--
-- The old key pair belonged to whichever gateway was switched on, so it is
-- copied to the first enabled gateway (Stripe, then PayPal, then Razorpay), or
-- to Stripe when only Cash on Delivery is on. The legacy columns are dropped
-- once copied.

ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS stripe_publishable_key VARCHAR(255);
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS stripe_secret_key VARCHAR(255);
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS paypal_client_id VARCHAR(255);
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS paypal_client_secret VARCHAR(255);
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS paypal_environment VARCHAR(10) NOT NULL DEFAULT 'sandbox' CHECK (paypal_environment IN ('sandbox', 'live'));
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS razorpay_key_id VARCHAR(255);
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS razorpay_key_secret VARCHAR(255);

UPDATE payment_settings
SET stripe_publishable_key = public_key, stripe_secret_key = secret_key
WHERE (stripe_enabled OR NOT (paypal_enabled OR razorpay_enabled))
  AND stripe_publishable_key IS NULL AND stripe_secret_key IS NULL;

UPDATE payment_settings
SET paypal_client_id = public_key, paypal_client_secret = secret_key
WHERE NOT stripe_enabled AND paypal_enabled
  AND paypal_client_id IS NULL AND paypal_client_secret IS NULL;

UPDATE payment_settings
SET razorpay_key_id = public_key, razorpay_key_secret = secret_key
WHERE NOT stripe_enabled AND NOT paypal_enabled AND razorpay_enabled
  AND razorpay_key_id IS NULL AND razorpay_key_secret IS NULL;

ALTER TABLE payment_settings DROP COLUMN IF EXISTS public_key;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS secret_key;

COMMENT ON TABLE payment_settings IS 'Backs the Settings -> Payment page. Singleton row (id = 1). At most one of stripe_enabled / paypal_enabled / razorpay_enabled is true, and at least one of those or cod_enabled is true; both rules are enforced by the API, not the database.';
COMMENT ON COLUMN payment_settings.cod_enabled IS 'Cash on delivery. May be on alone or alongside the one active online gateway.';
COMMENT ON COLUMN payment_settings.stripe_publishable_key IS 'Stripe publishable key. Kept when Stripe is switched off.';
COMMENT ON COLUMN payment_settings.stripe_secret_key IS 'Stripe secret key. Stored as plain text, like the integrations_settings secrets today; encrypt at rest before going live.';
COMMENT ON COLUMN payment_settings.paypal_client_id IS 'PayPal REST app client ID. Kept when PayPal is switched off.';
COMMENT ON COLUMN payment_settings.paypal_client_secret IS 'PayPal REST app client secret. Stored as plain text; encrypt at rest before going live.';
COMMENT ON COLUMN payment_settings.paypal_environment IS 'Which PayPal environment the client ID and secret belong to: sandbox or live.';
COMMENT ON COLUMN payment_settings.razorpay_key_id IS 'Razorpay key ID. Kept when Razorpay is switched off.';
COMMENT ON COLUMN payment_settings.razorpay_key_secret IS 'Razorpay key secret. Stored as plain text; encrypt at rest before going live.';
