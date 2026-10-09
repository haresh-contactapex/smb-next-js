-- Customer sign-in 2FA (subset of customers-table-only.sql and
-- settings/security-table-only.sql). Mirrors the staff version
-- (my-account/staff-login-otp-table-only.sql): a 6-digit code is emailed after
-- the password check, before the session cookie is created.
--
-- Safe to run against tables already created by customers-table-only.sql or
-- security-table-only.sql, whose CREATE TABLE IF NOT EXISTS won't retrofit
-- columns onto a table that already exists.
-- Dialect: PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

-- Per-customer opt-in, set from Account -> Profile & security.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN customers.two_factor_enabled IS 'Customer opted in to an emailed sign-in code. Also enforced for everyone when security_settings.require_customer_two_factor is on.';

-- Store-wide switch, set from Settings -> Security.
ALTER TABLE security_settings ADD COLUMN IF NOT EXISTS require_customer_two_factor BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN security_settings.require_customer_two_factor IS 'Require every customer to verify an emailed code at sign-in; distinct from require_two_factor_auth (staff) and the per-customer customers.two_factor_enabled opt-in.';

-- Its own table, not shared with staff_login_otps, so a customer code can never
-- be redeemed against a staff account or vice versa.
CREATE TABLE IF NOT EXISTS customer_login_otps (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    code_hash           VARCHAR(255) NOT NULL,
    requested_email     VARCHAR(255) NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    consumed_at         TIMESTAMPTZ NULL,
    attempts            SMALLINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN customer_login_otps.code_hash IS 'Bcrypt hash of the 6-digit code emailed to the customer (src/lib/auth/password.js); the raw code is never stored.';
COMMENT ON COLUMN customer_login_otps.requested_email IS 'Snapshot of customers.email at send time, independent of the column at verify time.';
COMMENT ON COLUMN customer_login_otps.expires_at IS 'Codes are short-lived, e.g. created_at + 120 seconds (src/lib/auth/loginOtp.js).';
COMMENT ON COLUMN customer_login_otps.consumed_at IS 'Set once the code is used to finish signing in, OR superseded by a resend; NULL = the one currently live for this customer.';
COMMENT ON COLUMN customer_login_otps.attempts IS 'Wrong guesses against this code. Past a cap (OTP_MAX_ATTEMPTS) the code is treated as locked and a resend is required.';

CREATE INDEX IF NOT EXISTS customer_login_otps_customer_id_idx ON customer_login_otps (customer_id);
CREATE INDEX IF NOT EXISTS customer_login_otps_expires_at_idx ON customer_login_otps (expires_at);
