-- Users table + staff password reset tokens (subset of my-account-database-schema.sql)
-- Used to back the Admin Panel's own staff login/logout/forgot-password
-- without requiring the addresses/payment_methods tables from the full
-- My Account schema.
-- Dialect: PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    avatar_url                  TEXT NULL,
    first_name                  VARCHAR(100) NOT NULL,
    last_name                   VARCHAR(100) NOT NULL,
    email                       VARCHAR(255) NOT NULL,
    phone                       VARCHAR(20) NULL,
    bio                         TEXT NULL,
    role                        VARCHAR(30) NOT NULL DEFAULT 'store_admin',
    language                    VARCHAR(5) NOT NULL DEFAULT 'en',
    timezone                    VARCHAR(20) NOT NULL DEFAULT 'UTC+00:00',
    two_factor_enabled          BOOLEAN NOT NULL DEFAULT false,
    password_hash               VARCHAR(255) NOT NULL,
    billing_same_as_shipping    BOOLEAN NOT NULL DEFAULT true,
    last_login_at               TIMESTAMPTZ NULL,
    password_changed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    failed_login_attempts       SMALLINT NOT NULL DEFAULT 0,
    locked_until                TIMESTAMPTZ NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT users_email_key UNIQUE (email)
);

-- Mirrors password_reset_tokens (Auth schema) for staff accounts, kept as its
-- own table rather than a shared one since a staff reset link must never be
-- redeemable against a customer account or vice versa.
CREATE TABLE IF NOT EXISTS staff_password_reset_tokens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash          VARCHAR(255) NOT NULL,
    requested_email     VARCHAR(255) NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    used_at             TIMESTAMPTZ NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT staff_password_reset_tokens_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS staff_password_reset_tokens_user_id_idx ON staff_password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS staff_password_reset_tokens_expires_at_idx ON staff_password_reset_tokens (expires_at);
