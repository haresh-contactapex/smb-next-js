-- Social Media settings table only (subset of settings-database-schema.sql)
-- Backs the Settings -> Social Media page and the storefront footer's social icons.
-- Dialect: PostgreSQL

CREATE TABLE IF NOT EXISTS social_media_settings (
    id                 SMALLINT PRIMARY KEY CHECK (id = 1),
    facebook_url       VARCHAR(255),
    instagram_url      VARCHAR(255),
    twitter_url        VARCHAR(255),
    pinterest_url      VARCHAR(255),
    tiktok_url         VARCHAR(255),
    youtube_url        VARCHAR(255),
    show_share_buttons BOOLEAN     NOT NULL DEFAULT true,
    show_footer_links  BOOLEAN     NOT NULL DEFAULT true,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE social_media_settings IS 'Backs the Settings -> Social Media page. Singleton row (id = 1). A blank URL hides that platform footer icon.';

-- Seeded with the links the storefront footer showed before this page was editable.
INSERT INTO social_media_settings (id, facebook_url, twitter_url, instagram_url, pinterest_url)
VALUES (1, 'https://www.facebook.com/shopmyband/', 'https://x.com/ShopMyBand', 'https://www.instagram.com/shopmyband/', 'https://www.pinterest.com/shopmyband/')
ON CONFLICT (id) DO NOTHING;
