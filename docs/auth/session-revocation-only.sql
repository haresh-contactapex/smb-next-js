-- Sign-out-everywhere support for staff and customer sessions.
--
-- Sessions are stateless JWTs. A logout, a password change or an email / two-factor change
-- stamps the account with sessions_valid_after, and any token issued before that moment is
-- rejected (src/lib/auth/sessionPolicy.js isTokenRevoked). Staff sessions are also rejected
-- when issued before users.password_changed_at, which needs no new column.
--
-- Safe to run more than once, and the app works (without this protection) until it is applied.
-- Dialect: PostgreSQL

ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_valid_after TIMESTAMPTZ NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sessions_valid_after TIMESTAMPTZ NULL;

COMMENT ON COLUMN users.sessions_valid_after IS 'NULL until the first logout / password or email change. A session token issued before this moment is no longer accepted.';
COMMENT ON COLUMN customers.sessions_valid_after IS 'NULL until the first logout / password change. A session token issued before this moment is no longer accepted.';
