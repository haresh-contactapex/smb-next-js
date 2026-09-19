-- Auth schema
-- Generated from docs/auth/auth-database-schema.md
-- Dialect: PostgreSQL
--
-- Notes:
--   * `password_reset_tokens.customer_id` references `customers`, defined in
--     the Orders schema (docs/orders/orders-database-schema.sql). Create
--     that table first, or drop the FK constraint below if this script runs
--     standalone.
--   * This file does not redefine or alter `customers`. Two follow-up
--     columns that Login/Register need on that table
--     (`terms_accepted_at`, `email_verified_at`) are called out in
--     auth-database-schema.md's Design notes rather than altered here, to
--     keep this script scoped to Auth.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

-- =========================================================================
-- password_reset_tokens
-- =========================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    token_hash          VARCHAR(255) NOT NULL,
    requested_email     VARCHAR(255) NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    used_at             TIMESTAMPTZ NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash)
);
COMMENT ON TABLE password_reset_tokens IS 'One row per Forgot Password "Send Reset Link" click.';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 of the raw token emailed to the customer; the raw token itself is never stored.';
COMMENT ON COLUMN password_reset_tokens.requested_email IS 'Snapshot of the email typed into the form, independent of customers.email at lookup time.';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Reset links are time-limited, e.g. created_at + 1 hour.';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Set once the link is used to change the password; NULL = still valid/pending. A used token must be rejected on any further attempt.';

CREATE INDEX IF NOT EXISTS password_reset_tokens_customer_id_idx ON password_reset_tokens (customer_id);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx ON password_reset_tokens (expires_at);
