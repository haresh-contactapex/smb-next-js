-- Newsletter subscribers (backs the home page "Stay in the Loop" form and Admin -> Newsletter)
-- Apply with: npm run db:migrate:newsletter
-- Standalone: no other table is required. Dialect: PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL,
    source      TEXT NOT NULL DEFAULT 'home-page',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE newsletter_subscribers IS 'An email address that signed up for discounts and offers on the storefront.';
COMMENT ON COLUMN newsletter_subscribers.email IS 'Stored lower-case, so the unique index below makes one row per address.';
COMMENT ON COLUMN newsletter_subscribers.source IS 'Which form the address came from (only the home page form exists so far).';

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_idx ON newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_created_idx ON newsletter_subscribers (created_at DESC);
