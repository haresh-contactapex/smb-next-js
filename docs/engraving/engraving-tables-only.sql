-- Engraving / personalization (tables and columns)
-- Apply with: npm run db:migrate:engraving
-- Requires the catalog (npm run db:migrate) and the order detail tables
-- (npm run db:migrate:order-details). Safe to run more than once.
-- Dialect: PostgreSQL
-- (No apostrophes or semicolons in these comments: scripts/migrate.mjs does
-- not strip comments from CRLF files, and it tracks quotes and semicolons.)
--
-- What this adds
--   engraving_settings    one row (id = 1): the global switch, the character
--                         rules and the help text shown to customers
--   engraving_categories  the categories whose products offer engraving
--   engraving_fonts       the font choices customers see, in display order
--   products.engraving_mode          inherit | enabled | disabled
--   order_line_items.engraving_*     what the customer asked for, frozen at
--                         checkout

CREATE TABLE IF NOT EXISTS engraving_settings (
    id               SMALLINT PRIMARY KEY CHECK (id = 1),
    enabled          BOOLEAN      NOT NULL DEFAULT true,
    max_characters   SMALLINT     NOT NULL DEFAULT 20 CHECK (max_characters BETWEEN 1 AND 50),
    allow_letters    BOOLEAN      NOT NULL DEFAULT true,
    allow_numbers    BOOLEAN      NOT NULL DEFAULT true,
    allow_spaces     BOOLEAN      NOT NULL DEFAULT true,
    allowed_symbols  VARCHAR(40)  NOT NULL DEFAULT '&.,''-!?/()#',
    help_text        VARCHAR(500) NOT NULL DEFAULT 'Add a personal message to your band. Please double-check the spelling, because the engraving is made exactly as you type it.',
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE engraving_settings IS 'Backs Settings > Engraving. Singleton row (id = 1).';
COMMENT ON COLUMN engraving_settings.enabled IS 'Global switch. Off hides engraving on every product, whatever the category or product setting says.';
COMMENT ON COLUMN engraving_settings.max_characters IS 'Longest engraving text allowed. The code never accepts more than 50.';
COMMENT ON COLUMN engraving_settings.allowed_symbols IS 'The basic symbols allowed besides letters, numbers and spaces. ASCII only.';

INSERT INTO engraving_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS engraving_fonts (
    id           VARCHAR(60)  PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]*$'),
    name         VARCHAR(60)  NOT NULL,
    font_family  VARCHAR(200) NOT NULL,
    google_font  VARCHAR(60)  NULL,
    is_enabled   BOOLEAN      NOT NULL DEFAULT true,
    position     INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE engraving_fonts IS 'The engraving font choices. The id is a stable slug that orders keep, so renaming a font never changes old orders.';
COMMENT ON COLUMN engraving_fonts.font_family IS 'CSS font-family value used to preview the engraving, for example Allura, cursive.';
COMMENT ON COLUMN engraving_fonts.google_font IS 'Optional Google Fonts family to load for the preview. NULL for system fonts.';
CREATE INDEX IF NOT EXISTS engraving_fonts_position_idx ON engraving_fonts (position);

CREATE TABLE IF NOT EXISTS engraving_categories (
    category_id  UUID PRIMARY KEY REFERENCES categories (id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE engraving_categories IS 'Categories whose products offer engraving. A product counts when it is listed under one of them or under one of their sub-categories.';

-- The starting fonts, taken from the engraving choices on the demo store.
-- Only added while the table is empty, so fonts an admin later removes stay removed.
INSERT INTO engraving_fonts (id, name, font_family, google_font, is_enabled, position)
SELECT v.id, v.name, v.font_family, v.google_font, true, v.position
FROM (VALUES
    ('adore',            'Adore',            'Allura, cursive',                     'Allura',             1),
    ('als-script',       'ALS Script',       'Satisfy, cursive',                    'Satisfy',            2),
    ('angelina',         'Angelina',         'Alex Brush, cursive',                 'Alex Brush',         3),
    ('arial',            'Arial',            'Arial, Helvetica, sans-serif',        NULL,                 4),
    ('avantegarde',      'Avantegarde',      'Questrial, sans-serif',               'Questrial',          5),
    ('caesar',           'Caesar',           'Cinzel, serif',                       'Cinzel',             6),
    ('celtic',           'Celtic',           'Uncial Antiqua, serif',               'Uncial Antiqua',     7),
    ('christine',        'Christine',        'Great Vibes, cursive',                'Great Vibes',        8),
    ('clean',            'Clean',            'Montserrat, sans-serif',              'Montserrat',         9),
    ('cloister-black',   'Cloister Black',   'UnifrakturMaguntia, serif',           'UnifrakturMaguntia', 10),
    ('english',          'English',          'Pinyon Script, cursive',              'Pinyon Script',      11),
    ('fontleroy-brown',  'Fontleroy Brown',  'Lobster, cursive',                    'Lobster',            12),
    ('frenchscript',     'Frenchscript',     'Parisienne, cursive',                 'Parisienne',         13),
    ('futura',           'Futura',           'Jost, sans-serif',                    'Jost',               14),
    ('helvetica',        'Helvetica',        'Helvetica, Arial, sans-serif',        NULL,                 15),
    ('iskola-italliano', 'Iskola Italliano', 'Italianno, cursive',                  'Italianno',          16),
    ('tahoma',           'Tahoma',           'Tahoma, Verdana, sans-serif',         NULL,                 17),
    ('victorian',        'Victorian',        'IM Fell English, serif',              'IM Fell English',    18)
) AS v (id, name, font_family, google_font, position)
WHERE NOT EXISTS (SELECT 1 FROM engraving_fonts);

-- Product level choice. inherit follows the categories above, enabled and
-- disabled override them for this one product.
ALTER TABLE products ADD COLUMN IF NOT EXISTS engraving_mode VARCHAR(10) NOT NULL DEFAULT 'inherit';
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_engraving_mode_check;
ALTER TABLE products ADD CONSTRAINT products_engraving_mode_check CHECK (engraving_mode IN ('inherit', 'enabled', 'disabled'));
COMMENT ON COLUMN products.engraving_mode IS 'inherit = follow the engraving categories, enabled = always offer engraving, disabled = never offer it.';

-- What the customer asked for, copied onto the order so later changes to the
-- fonts or settings never alter an order that was already placed.
ALTER TABLE order_line_items ADD COLUMN IF NOT EXISTS engraving_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE order_line_items ADD COLUMN IF NOT EXISTS engraving_text VARCHAR(100) NULL;
ALTER TABLE order_line_items ADD COLUMN IF NOT EXISTS engraving_font_id VARCHAR(60) NULL;
ALTER TABLE order_line_items ADD COLUMN IF NOT EXISTS engraving_font_name VARCHAR(60) NULL;
COMMENT ON COLUMN order_line_items.engraving_enabled IS 'True when the customer personalized this item with engraving.';
COMMENT ON COLUMN order_line_items.engraving_text IS 'The sanitized engraving text, exactly as it is to be engraved.';
COMMENT ON COLUMN order_line_items.engraving_font_id IS 'engraving_fonts.id at purchase time. Not a foreign key, so removing a font keeps old orders readable.';
COMMENT ON COLUMN order_line_items.engraving_font_name IS 'Snapshot of the font display name at purchase time.';
