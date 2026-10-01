-- Wishlist table (backs the storefront heart icons, the header counter and /wishlist)
-- Apply with: npm run db:migrate:wishlist
-- Requires customers (npm run db:migrate:customers) and products + product_variants
-- (npm run db:migrate). Dialect: PostgreSQL
-- Only signed-in customers have rows here. A guest keeps the list in the browser
-- (localStorage) and it is merged into this table at sign-in / registration.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

CREATE TABLE IF NOT EXISTS wishlist_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    product_id    UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    variant_id    UUID NULL REFERENCES product_variants (id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE wishlist_items IS 'A product (optionally a specific variant) a signed-in customer saved for later.';
COMMENT ON COLUMN wishlist_items.variant_id IS 'NULL when the customer saved the product without choosing a color/size, for example from the heart on a listing card.';

-- One row per customer + product + variant. COALESCE makes the "no variant" rows
-- unique too, since NULLs are otherwise treated as distinct by a unique index.
CREATE UNIQUE INDEX IF NOT EXISTS wishlist_items_unique_idx
    ON wishlist_items (customer_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS wishlist_items_customer_idx ON wishlist_items (customer_id, created_at DESC);
