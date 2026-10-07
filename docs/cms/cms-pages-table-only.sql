-- CMS pages (tables only)
-- Apply with: npm run db:migrate:cms
-- Requires the staff users table (npm run db:migrate:staff-users). Safe to run more than once.
-- Dialect: PostgreSQL
-- (No apostrophes or semicolons in these comments: scripts/migrate.mjs does
-- not strip comments from CRLF files, and it tracks quotes and semicolons.)
--
-- What this adds
--   cms_pages           the content pages staff edit under CMS in the admin
--                       panel (About Us, Privacy Policy, Ring Size Calculator...)
--                       and the storefront shows at /<slug>
--   cms_page_revisions  the previous version of a page, kept every time its
--                       title or body changes, so an edit can be undone

CREATE TABLE IF NOT EXISTS cms_pages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             VARCHAR(100) NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    title            VARCHAR(200) NOT NULL,
    content_html     TEXT         NOT NULL DEFAULT '',
    seo_title        VARCHAR(200) NULL,
    seo_description  VARCHAR(500) NULL,
    status           VARCHAR(10)  NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    footer_group     VARCHAR(30)  NULL CHECK (footer_group IN ('customer-service', 'education')),
    footer_label     VARCHAR(100) NULL,
    position         INTEGER      NOT NULL DEFAULT 0,
    created_by       UUID NULL REFERENCES users (id) ON DELETE SET NULL,
    updated_by       UUID NULL REFERENCES users (id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE cms_pages IS 'Backs the CMS menu in the admin panel. Published pages are served by the storefront at /<slug>.';
COMMENT ON COLUMN cms_pages.slug IS 'The public URL segment. Unique, lowercase letters, numbers and hyphens. Never one of the storefront own routes (see src/lib/cmsRules.js).';
COMMENT ON COLUMN cms_pages.content_html IS 'Page body. Cleaned by src/lib/sanitizeHtml.js (cms profile) when saved and again when shown.';
COMMENT ON COLUMN cms_pages.status IS 'draft pages are only visible in the admin panel and answer 404 on the storefront.';
COMMENT ON COLUMN cms_pages.footer_group IS 'The storefront footer column a published page is listed in, or NULL to leave it out of the footer.';
COMMENT ON COLUMN cms_pages.footer_label IS 'A shorter name for the footer link. NULL uses the page title.';
COMMENT ON COLUMN cms_pages.position IS 'Order within its footer column and within the admin list. Lower comes first.';

CREATE UNIQUE INDEX IF NOT EXISTS cms_pages_slug_key ON cms_pages (slug);
CREATE INDEX IF NOT EXISTS cms_pages_footer_idx ON cms_pages (footer_group, position) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS cms_page_revisions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id       UUID NOT NULL REFERENCES cms_pages (id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    content_html  TEXT         NOT NULL,
    edited_by     UUID NULL REFERENCES users (id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE cms_page_revisions IS 'Older versions of a CMS page. The application keeps the latest 20 per page.';
COMMENT ON COLUMN cms_page_revisions.edited_by IS 'Who saved the version that replaced this one, not who wrote this one.';

CREATE INDEX IF NOT EXISTS cms_page_revisions_page_idx ON cms_page_revisions (page_id, created_at DESC);
