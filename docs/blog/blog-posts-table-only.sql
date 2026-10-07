-- Blog posts (tables only)
-- Apply with: npm run db:migrate:blog
-- Requires the staff users table (npm run db:migrate:staff-users). Safe to run more than once.
-- Dialect: PostgreSQL
-- (No apostrophes or semicolons in these comments: scripts/migrate.mjs does
-- not strip comments from CRLF files, and it tracks quotes and semicolons.)
--
-- What this adds
--   blog_posts           the articles staff write under Blog in the admin panel and
--                        the storefront shows at /blogs/<category>/<slug>
--   blog_post_revisions  the previous version of a post, kept every time its title
--                        or body changes, so an edit can be undone

CREATE TABLE IF NOT EXISTS blog_posts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                VARCHAR(120) NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    title               VARCHAR(200) NOT NULL,
    excerpt             VARCHAR(500) NULL,
    content_html        TEXT         NOT NULL DEFAULT '',
    featured_image_url  VARCHAR(500) NULL,
    featured_image_alt  VARCHAR(200) NULL,
    category_name       VARCHAR(80)  NOT NULL,
    category_slug       VARCHAR(80)  NOT NULL CHECK (category_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    author_name         VARCHAR(100) NULL,
    tags                TEXT[]       NOT NULL DEFAULT '{}',
    published_on        DATE         NULL,
    seo_title           VARCHAR(200) NULL,
    seo_description     VARCHAR(500) NULL,
    status              VARCHAR(10)  NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_by          UUID NULL REFERENCES users (id) ON DELETE SET NULL,
    updated_by          UUID NULL REFERENCES users (id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE blog_posts IS 'Backs the Blog menu in the admin panel. Published posts are served by the storefront at /blogs/<category_slug>/<slug>.';
COMMENT ON COLUMN blog_posts.slug IS 'The post handle in its URL. Unique across all posts, lowercase letters, numbers and hyphens.';
COMMENT ON COLUMN blog_posts.excerpt IS 'Short summary shown on the blog listing cards. NULL uses the start of the body.';
COMMENT ON COLUMN blog_posts.content_html IS 'Post body. Cleaned by src/lib/sanitizeHtml.js (cms profile) when saved and again when shown.';
COMMENT ON COLUMN blog_posts.featured_image_url IS 'Picture shown on the listing card and above the body. A /path on this site or an https URL.';
COMMENT ON COLUMN blog_posts.category_name IS 'Display name of the category (the old blog name, for example Classic Bands).';
COMMENT ON COLUMN blog_posts.category_slug IS 'URL segment of the category, always the slug of category_name. Posts of one category share one name.';
COMMENT ON COLUMN blog_posts.published_on IS 'The date shown on the post, in UTC. A published post with a later date goes live on that date.';
COMMENT ON COLUMN blog_posts.status IS 'draft posts are only visible in the admin panel and answer 404 on the storefront.';

CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_slug_key ON blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_listing_idx ON blog_posts (published_on DESC, created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON blog_posts (category_slug, published_on DESC) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS blog_post_revisions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id       UUID NOT NULL REFERENCES blog_posts (id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    content_html  TEXT         NOT NULL,
    edited_by     UUID NULL REFERENCES users (id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE blog_post_revisions IS 'Older versions of a blog post. The application keeps the latest 20 per post.';
COMMENT ON COLUMN blog_post_revisions.edited_by IS 'Who saved the version that replaced this one, not who wrote this one.';

CREATE INDEX IF NOT EXISTS blog_post_revisions_post_idx ON blog_post_revisions (post_id, created_at DESC);
