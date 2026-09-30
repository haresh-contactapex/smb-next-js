-- Product reviews table (backs Product Reviews: All Reviews, Add Review, Edit Review)
-- Apply with: npm run db:migrate:reviews
-- Requires the products table (npm run db:migrate). Dialect: PostgreSQL
-- A table created before half-star ratings existed is upgraded by
-- reviews-half-star-ratings-only.sql (npm run db:migrate:reviews-half-stars).

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS product_reviews (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    rating        NUMERIC(2, 1) NOT NULL
                  CHECK (rating BETWEEN 0.5 AND 5 AND rating * 2 = trunc(rating * 2)),
    title         VARCHAR(150) NOT NULL,
    content       TEXT NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    email         VARCHAR(254) NOT NULL,
    status        VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE product_reviews IS 'Customer product reviews moderated from the admin panel.';
COMMENT ON COLUMN product_reviews.rating IS 'Star rating from 0.5 (worst) to 5 (best), in half-star steps.';
COMMENT ON COLUMN product_reviews.display_name IS 'Public name shown next to the review; not tied to a customer account.';
COMMENT ON COLUMN product_reviews.email IS 'Reviewer contact address. Admin-only, never shown publicly. Stored lowercase.';
COMMENT ON COLUMN product_reviews.status IS 'Moderation state: only APPROVED reviews should ever be shown on the storefront.';

CREATE INDEX IF NOT EXISTS product_reviews_product_id_idx ON product_reviews (product_id);
CREATE INDEX IF NOT EXISTS product_reviews_status_idx ON product_reviews (status);
CREATE INDEX IF NOT EXISTS product_reviews_created_at_idx ON product_reviews (created_at DESC);
