-- Categories / Products catalog schema
-- Generated from docs/category-product/category-product-catalog-database-schema.md
-- Dialect: PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

-- =========================================================================
-- categories
-- =========================================================================
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(120) NOT NULL,
    slug            VARCHAR(140) NOT NULL,
    parent_id       UUID NULL REFERENCES categories (id) ON DELETE SET NULL,
    description     TEXT NULL,
    image_url       TEXT NULL,
    theme_template  VARCHAR(20) NOT NULL DEFAULT 'default'
                    CHECK (theme_template IN ('default', 'featured', 'grid')),
    is_visible      BOOLEAN NOT NULL DEFAULT true,
    seo_title       VARCHAR(70) NULL,
    seo_description VARCHAR(160) NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT categories_slug_key UNIQUE (slug)
);

CREATE INDEX categories_parent_id_idx ON categories (parent_id);

-- =========================================================================
-- products
-- =========================================================================
CREATE TABLE products (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(255) NOT NULL,
    handle              VARCHAR(255) NOT NULL,
    description         TEXT NULL,
    category_id         UUID NULL REFERENCES categories (id) ON DELETE SET NULL,
    product_type        VARCHAR(100) NULL,
    vendor              VARCHAR(150) NULL,
    status              VARCHAR(10) NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN ('ACTIVE', 'DRAFT', 'ARCHIVED')),
    price               DECIMAL(12, 2) NOT NULL DEFAULT 0,
    compare_at_price    DECIMAL(12, 2) NULL,
    cost_per_item       DECIMAL(12, 2) NULL,
    charge_tax          BOOLEAN NOT NULL DEFAULT true,
    track_quantity      BOOLEAN NOT NULL DEFAULT true,
    inventory_quantity  INTEGER NULL,
    sku                 VARCHAR(100) NULL,
    barcode             VARCHAR(100) NULL,
    is_physical_product BOOLEAN NOT NULL DEFAULT true,
    weight              DECIMAL(10, 3) NULL,
    weight_unit         VARCHAR(5) NOT NULL DEFAULT 'kg'
                        CHECK (weight_unit IN ('kg', 'g', 'lb', 'oz')),
    hs_code             VARCHAR(20) NULL,
    seo_title           VARCHAR(70) NULL,
    seo_description     VARCHAR(160) NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT products_handle_key UNIQUE (handle)
);

CREATE INDEX products_category_id_idx ON products (category_id);
CREATE INDEX products_status_idx ON products (status);
CREATE INDEX products_sku_idx ON products (sku);

-- =========================================================================
-- product_options
-- =========================================================================
CREATE TABLE product_options (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    position    SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT product_options_product_id_name_key UNIQUE (product_id, name)
);

-- =========================================================================
-- product_option_values
-- =========================================================================
CREATE TABLE product_option_values (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id   UUID NOT NULL REFERENCES product_options (id) ON DELETE CASCADE,
    value       VARCHAR(100) NOT NULL,
    position    SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT product_option_values_option_id_value_key UNIQUE (option_id, value)
);

-- =========================================================================
-- product_variants
-- =========================================================================
CREATE TABLE product_variants (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id            UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    sku                   VARCHAR(100) NULL,
    price                 DECIMAL(12, 2) NULL,
    compare_at_price      DECIMAL(12, 2) NULL,
    inventory_quantity    INTEGER NOT NULL DEFAULT 0,
    inventory_management  BOOLEAN NOT NULL DEFAULT true,
    weight                DECIMAL(10, 3) NULL,
    weight_unit           VARCHAR(5) NOT NULL DEFAULT 'kg'
                          CHECK (weight_unit IN ('kg', 'g', 'lb', 'oz')),
    image_url             TEXT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_variants_product_id_idx ON product_variants (product_id);
CREATE UNIQUE INDEX product_variants_sku_key ON product_variants (sku) WHERE sku IS NOT NULL;

-- =========================================================================
-- variant_option_values
-- =========================================================================
CREATE TABLE variant_option_values (
    variant_id        UUID NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
    option_value_id   UUID NOT NULL REFERENCES product_option_values (id) ON DELETE CASCADE,

    PRIMARY KEY (variant_id, option_value_id)
);

-- =========================================================================
-- product_media
-- =========================================================================
CREATE TABLE product_media (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    type        VARCHAR(10) NOT NULL CHECK (type IN ('image', 'video', 'model')),
    url         TEXT NOT NULL,
    name        VARCHAR(255) NULL,
    position    SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX product_media_product_id_idx ON product_media (product_id);

-- =========================================================================
-- collections
-- =========================================================================
CREATE TABLE collections (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name    VARCHAR(150) NOT NULL,
    slug    VARCHAR(160) NOT NULL,

    CONSTRAINT collections_name_key UNIQUE (name),
    CONSTRAINT collections_slug_key UNIQUE (slug)
);

-- =========================================================================
-- product_collections
-- =========================================================================
CREATE TABLE product_collections (
    product_id      UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    collection_id   UUID NOT NULL REFERENCES collections (id) ON DELETE CASCADE,

    PRIMARY KEY (product_id, collection_id)
);

-- =========================================================================
-- tags
-- =========================================================================
CREATE TABLE tags (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name    VARCHAR(60) NOT NULL,

    CONSTRAINT tags_name_key UNIQUE (name)
);

-- =========================================================================
-- product_tags
-- =========================================================================
CREATE TABLE product_tags (
    product_id  UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    tag_id      UUID NOT NULL REFERENCES tags (id) ON DELETE CASCADE,

    PRIMARY KEY (product_id, tag_id)
);
