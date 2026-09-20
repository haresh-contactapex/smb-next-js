-- Media library schema
-- Reusable, cross-product uploaded files (WordPress-style media library).
-- Dialect: PostgreSQL

CREATE TABLE media (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name   VARCHAR(255) NOT NULL,
    url         TEXT NOT NULL,
    mime_type   VARCHAR(100) NULL,
    size_bytes  INTEGER NULL,
    alt_text    VARCHAR(255) NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX media_created_at_idx ON media (created_at DESC);
