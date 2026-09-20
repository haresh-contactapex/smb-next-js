-- Adds the Settings -> Security enforcement columns to an existing `users`
-- table (subset of my-account-database-schema.sql). Safe to run against a
-- table already created by users-table-only.sql or the full schema, since
-- users-table-only.sql's CREATE TABLE IF NOT EXISTS won't retrofit columns
-- onto a table that already exists.
-- Dialect: PostgreSQL

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ NULL;

COMMENT ON COLUMN users.password_changed_at IS 'Backs Settings -> Security "Password Expiry (days)": the password must be changed after this many days.';
COMMENT ON COLUMN users.failed_login_attempts IS 'Consecutive failed sign-in attempts since the last success or lockout reset.';
COMMENT ON COLUMN users.locked_until IS 'NULL when not locked. Set once failed_login_attempts reaches Settings -> Security "Max Login Attempts Before Lockout".';
