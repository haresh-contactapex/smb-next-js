-- Storefront footer text (table only)
-- Apply with: npm run db:migrate:footer-texts
-- Requires the staff users table (npm run db:migrate:staff-users). Safe to run more than once,
-- and brings an earlier version of this table up to date (adds hidden).
-- Dialect: PostgreSQL
-- (No apostrophes or semicolons in these comments: scripts/migrate.mjs does
-- not strip comments from CRLF files, and it tracks quotes and semicolons.)
--
-- What this adds
--   footer_texts  the store text shown under the footer photo panel. One row
--                 per storefront page address, plus one row for every other page.
--                 A row can be hidden, so that page shows no text at all.
--                 Staff edit them under CMS, Footer Text in the admin panel.

CREATE TABLE IF NOT EXISTS footer_texts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path        VARCHAR(200)  NOT NULL CHECK (path = '*' OR path ~ '^/([a-z0-9_-]+(/[a-z0-9_-]+)*)?$'),
    content     TEXT          NOT NULL DEFAULT '',
    hidden      BOOLEAN       NOT NULL DEFAULT false,
    updated_by  UUID NULL REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Upgrade from the first version of the table: add hidden, and let a hidden row have no text.
ALTER TABLE footer_texts ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE footer_texts ALTER COLUMN content SET DEFAULT '';
ALTER TABLE footer_texts DROP CONSTRAINT IF EXISTS footer_texts_content_check;
ALTER TABLE footer_texts DROP CONSTRAINT IF EXISTS footer_texts_content_or_hidden;
ALTER TABLE footer_texts ADD CONSTRAINT footer_texts_content_or_hidden CHECK (hidden OR length(btrim(content)) > 0);

COMMENT ON TABLE footer_texts IS 'Backs CMS, Footer Text in the admin panel. The storefront footer shows the row whose path matches the page, else the * row.';
COMMENT ON COLUMN footer_texts.path IS 'Storefront page address such as /classic-bands or /collections/eternity-bands (lowercase, no trailing slash). The single value * is the text for every page without its own row.';
COMMENT ON COLUMN footer_texts.content IS 'Plain text. A blank line starts a new paragraph. Never treated as HTML. May be empty only when hidden.';
COMMENT ON COLUMN footer_texts.hidden IS 'When true the page (or every page without its own row, for the * row) shows no footer text. The text is kept so it can be shown again.';

CREATE UNIQUE INDEX IF NOT EXISTS footer_texts_path_key ON footer_texts (path);
