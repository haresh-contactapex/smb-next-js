-- Customer sign-in lockout (subset of customers-table-only.sql). Mirrors the staff
-- columns in my-account/users-security-columns-only.sql: consecutive wrong passwords
-- are counted per customer and the account is locked for a while once the cap is hit.
--
-- Safe to run against a customers table already created by customers-table-only.sql,
-- whose CREATE TABLE IF NOT EXISTS won't retrofit columns onto an existing table.
-- Dialect: PostgreSQL

ALTER TABLE customers ADD COLUMN IF NOT EXISTS failed_login_attempts SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ NULL;

COMMENT ON COLUMN customers.failed_login_attempts IS 'Consecutive wrong-password sign-ins since the last success or lockout (src/lib/auth/customerLockout.js).';
COMMENT ON COLUMN customers.locked_until IS 'NULL when not locked. Set once failed_login_attempts reaches Settings -> Security "Max Login Attempts Before Lockout" (default 10 when that is 0).';
