-- Upgrade product_reviews.rating from whole stars (SMALLINT 1-5) to whole and
-- half stars (NUMERIC(2,1), 0.5-5 in steps of 0.5).
-- Apply with: npm run db:migrate:reviews-half-stars
-- Requires product_reviews (npm run db:migrate:reviews). Safe to re-run, and
-- existing ratings are kept (4 becomes 4.0). Dialect: PostgreSQL

ALTER TABLE product_reviews DROP CONSTRAINT IF EXISTS product_reviews_rating_check;
ALTER TABLE product_reviews ALTER COLUMN rating TYPE NUMERIC(2, 1);
ALTER TABLE product_reviews ADD CONSTRAINT product_reviews_rating_check
    CHECK (rating BETWEEN 0.5 AND 5 AND rating * 2 = trunc(rating * 2));
COMMENT ON COLUMN product_reviews.rating IS 'Star rating from 0.5 (worst) to 5 (best), in half-star steps.';
