-- Multiple categories per product: adds the product_categories join table.
-- Apply with: npm run db:migrate:product-categories
-- Requires products and categories (npm run db:migrate). Safe to re-run.
-- products.category_id stays as the primary (first) category of each product,
-- so every reader that only needs one category keeps working. Each existing
-- category is copied in as the first row for its product. The app counts
-- category_id as a member whether or not it has a row here, so products
-- written later by a script that only sets category_id are still found.
-- Dialect: PostgreSQL
-- (No apostrophes or semicolons in these comments: scripts/migrate.mjs does
-- not strip them from CRLF files, and it tracks quotes and semicolons.)

CREATE TABLE IF NOT EXISTS product_categories (
    product_id   UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    category_id  UUID NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
    position     SMALLINT NOT NULL DEFAULT 0,

    PRIMARY KEY (product_id, category_id)
);

CREATE INDEX IF NOT EXISTS product_categories_category_id_idx ON product_categories (category_id);

INSERT INTO product_categories (product_id, category_id, position)
SELECT id, category_id, 0 FROM products WHERE category_id IS NOT NULL
ON CONFLICT (product_id, category_id) DO NOTHING;
