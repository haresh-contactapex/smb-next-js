-- Storefront footer text (table only)
-- Apply with: npm run db:migrate:footer-texts
-- Requires the staff users table (npm run db:migrate:staff-users). Safe to run more than once.
-- Dialect: PostgreSQL
-- (No apostrophes or semicolons in these comments: scripts/migrate.mjs does
-- not strip comments from CRLF files, and it tracks quotes and semicolons.)
--
-- What this adds
--   footer_texts  the store text shown under the footer photo panel. One row
--                 per storefront page address, plus one row for every other page.
--                 Staff edit them under CMS, Footer Text in the admin panel.

CREATE TABLE IF NOT EXISTS footer_texts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path        VARCHAR(200)  NOT NULL CHECK (path = '*' OR path ~ '^/([a-z0-9_-]+(/[a-z0-9_-]+)*)?$'),
    content     TEXT          NOT NULL CHECK (length(btrim(content)) > 0),
    updated_by  UUID NULL REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON TABLE footer_texts IS 'Backs CMS, Footer Text in the admin panel. The storefront footer shows the row whose path matches the page, else the * row.';
COMMENT ON COLUMN footer_texts.path IS 'Storefront page address such as /classic-bands or /collections/eternity-bands (lowercase, no trailing slash). The single value * is the text for every page without its own row.';
COMMENT ON COLUMN footer_texts.content IS 'Plain text. A blank line starts a new paragraph. Never treated as HTML.';

CREATE UNIQUE INDEX IF NOT EXISTS footer_texts_path_key ON footer_texts (path);
