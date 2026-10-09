-- Staff sign-in 2FA: one-time passcodes emailed after a staff member's
-- password is verified, before their session is created (subset of
-- my-account-database-schema.sql). Mirrors staff_password_reset_tokens
-- (users-table-only.sql): its own table, not shared with customers, since a
-- staff login code must never be usable against a customer account.
-- Dialect: PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS staff_login_otps (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code_hash           VARCHAR(255) NOT NULL,
    requested_email     VARCHAR(255) NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    consumed_at         TIMESTAMPTZ NULL,
    attempts            SMALLINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN staff_login_otps.code_hash IS 'Bcrypt hash of the 6-digit code emailed to the user (src/lib/auth/password.js); the raw code is never stored.';
COMMENT ON COLUMN staff_login_otps.requested_email IS 'Snapshot of users.email at send time, independent of the column at verify time.';
COMMENT ON COLUMN staff_login_otps.expires_at IS 'Codes are short-lived, e.g. created_at + 120 seconds (src/lib/auth/loginOtp.js).';
COMMENT ON COLUMN staff_login_otps.consumed_at IS 'Set once the code is used to finish signing in, OR superseded by a resend; NULL = the one currently live for this user.';
COMMENT ON COLUMN staff_login_otps.attempts IS 'Wrong guesses against this code. Past a cap (OTP_MAX_ATTEMPTS) the code is treated as locked and a resend is required.';

CREATE INDEX IF NOT EXISTS staff_login_otps_user_id_idx ON staff_login_otps (user_id);
CREATE INDEX IF NOT EXISTS staff_login_otps_expires_at_idx ON staff_login_otps (expires_at);
