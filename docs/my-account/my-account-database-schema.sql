-- My Account schema
-- Generated from docs/my-account/my-account-database-schema.md
-- Dialect: PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

-- =========================================================================
-- users
-- =========================================================================
CREATE TABLE users (
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

-- =========================================================================
-- addresses
-- =========================================================================
CREATE TABLE addresses (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type                    VARCHAR(10) NOT NULL
                            CHECK (type IN ('BILLING', 'SHIPPING')),
    full_name               VARCHAR(150) NOT NULL,
    company                 VARCHAR(150) NULL,
    address_line1           VARCHAR(255) NOT NULL,
    address_line2           VARCHAR(255) NULL,
    city                    VARCHAR(100) NOT NULL,
    state                   VARCHAR(100) NULL,
    postal_code             VARCHAR(20) NULL,
    country                 VARCHAR(100) NOT NULL DEFAULT 'United States',
    phone                   VARCHAR(20) NULL,
    same_as_billing         BOOLEAN NOT NULL DEFAULT true,
    delivery_instructions   TEXT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT addresses_user_id_type_key UNIQUE (user_id, type)
);

-- =========================================================================
-- payment_methods
-- =========================================================================
CREATE TABLE payment_methods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    brand           VARCHAR(30) NOT NULL,
    last4           CHAR(4) NOT NULL,
    exp_month       CHAR(2) NOT NULL,
    exp_year        CHAR(2) NOT NULL,
    holder_name     VARCHAR(150) NOT NULL,
    is_default      BOOLEAN NOT NULL DEFAULT false,
    provider_token  VARCHAR(255) NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_methods_user_id_idx ON payment_methods (user_id);
