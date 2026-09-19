-- Addresses table only (subset of my-account-database-schema.sql)
-- Used to back the Admin Panel's own Address page (one BILLING + one
-- SHIPPING row per staff user) without requiring the payment_methods table
-- from the full My Account schema.
-- Dialect: PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS addresses (
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
