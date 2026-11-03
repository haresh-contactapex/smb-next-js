-- Storefront home page content (table only)
-- Apply with: npm run db:migrate:home-page
-- Requires the staff users table (npm run db:migrate:staff-users). Safe to run more than once.
-- Dialect: PostgreSQL
-- (No apostrophes or semicolons in these comments: scripts/migrate.mjs does
-- not strip comments from CRLF files, and it tracks quotes and semicolons.)
--
-- What this adds
--   home_page  the editable content of the storefront home page: hero text and
--              photos, the perks line, collection tiles, the story block, the
--              assurance items and the newsletter heading. A single row (id = 1).
--              Staff edit it under CMS, Home Page in the admin panel. Until a row
--              exists the storefront shows the content the store launched with.

CREATE TABLE IF NOT EXISTS home_page (
    id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    content     JSONB         NOT NULL,
    updated_by  UUID NULL REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE home_page IS 'Backs CMS, Home Page in the admin panel. One row; the storefront home page renders its content.';
COMMENT ON COLUMN home_page.content IS 'JSON checked by normalizeHomePage in src/lib/shared/homePage.js before every save. Text is never treated as HTML.';
