import { sql, sqlTransaction } from "./db";
import { isMissingRelation, isUuid } from "./accountError";
import { listCategories } from "./categories";
import {
  MAX_ENGRAVING_FONTS,
  sanitizeEngravingSettings,
  validateEngravingFont,
  validateEngravingSettings,
} from "./engravingRules";

// Persistence for Settings -> Engraving: the global rules, the categories that offer engraving
// and the font choices. The storefront side (is this product eligible, what does checkout
// accept) is in engraving.js. See docs/engraving/engraving.md.

const MAX_CATEGORIES = 1000;

// A problem the admin can act on. Route handlers answer with `status`.
export class EngravingError extends Error {
  constructor(message, status = 400, field = null) {
    super(message);
    this.name = "EngravingError";
    this.status = status;
    this.field = field;
  }
}

const NOT_MIGRATED = "The engraving tables are missing. Run `npm run db:migrate:engraving` and try again.";

// Neon reports a table or column that was never migrated as 42P01 / 42703.
export function translateMissingTables(error) {
  return isMissingRelation(error) ? new EngravingError(NOT_MIGRATED, 503) : error;
}

export function rowToSettings(row) {
  return sanitizeEngravingSettings({
    enabled: row.enabled,
    maxCharacters: Number(row.max_characters),
    allowLetters: row.allow_letters,
    allowNumbers: row.allow_numbers,
    allowSpaces: row.allow_spaces,
    allowedSymbols: row.allowed_symbols,
    helpText: row.help_text,
  });
}

export function rowToFont(row) {
  return {
    id: row.id,
    name: row.name,
    fontFamily: row.font_family,
    googleFont: row.google_font || "",
    enabled: row.is_enabled,
    position: Number(row.position) || 0,
  };
}

// Everything the settings page edits, plus the category list it picks from.
export async function getEngravingAdminConfig() {
  try {
    const [settingsRows, fontRows, selectedRows, categories] = await Promise.all([
      sql`SELECT * FROM engraving_settings WHERE id = 1`,
      sql`SELECT * FROM engraving_fonts ORDER BY position, name`,
      sql`SELECT category_id FROM engraving_categories`,
      listCategories(),
    ]);
    return {
      settings: settingsRows[0] ? rowToSettings(settingsRows[0]) : sanitizeEngravingSettings({}),
      fonts: fontRows.map(rowToFont),
      categoryIds: selectedRows.map((row) => row.category_id),
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        path: category.parentPath ? `${category.parentPath} > ${category.name}` : category.name,
        productCount: category.productCount,
      })),
    };
  } catch (error) {
    throw translateMissingTables(error);
  }
}

// Validates and cleans the fonts the admin submitted. Ids that repeat get a numeric suffix, so
// two new fonts with the same name still both save.
function cleanFonts(rawFonts) {
  if (!Array.isArray(rawFonts)) throw new EngravingError("The font list isn't valid.");
  if (rawFonts.length > MAX_ENGRAVING_FONTS) throw new EngravingError(`You can have up to ${MAX_ENGRAVING_FONTS} engraving fonts.`);

  const used = new Set();
  return rawFonts.map((raw, index) => {
    const { font, errors } = validateEngravingFont(raw);
    const [field] = Object.keys(errors);
    if (field) {
      throw new EngravingError(`Font ${index + 1}${font.name ? ` (${font.name})` : ""}: ${errors[field]}`, 400, `fonts.${index}.${field}`);
    }

    let id = font.id;
    for (let suffix = 2; used.has(id); suffix += 1) id = `${font.id.slice(0, 56)}-${suffix}`;
    used.add(id);
    return { ...font, id, position: index + 1 };
  });
}

// Saves the whole configuration in one transaction: either all of it is stored or none of it.
// `settings` is checked with the same rules the form uses; categories that no longer exist are
// ignored; fonts that are no longer in the list are removed (old orders keep their own copy of
// the font name, so nothing already placed changes).
export async function saveEngravingAdminConfig({ settings: rawSettings, categoryIds: rawCategoryIds, fonts: rawFonts }) {
  const settings = sanitizeEngravingSettings(rawSettings);
  const { errors } = validateEngravingSettings(settings);
  const [firstError] = Object.entries(errors);
  if (firstError) throw new EngravingError(firstError[1], 400, firstError[0]);

  if (!Array.isArray(rawCategoryIds) || rawCategoryIds.length > MAX_CATEGORIES || rawCategoryIds.some((id) => !isUuid(id))) {
    throw new EngravingError("The selected categories aren't valid.");
  }
  const categoryIds = [...new Set(rawCategoryIds)];
  const fonts = cleanFonts(rawFonts);

  try {
    await sqlTransaction((tx) => {
      const statements = [
        tx`
          UPDATE engraving_settings SET
            enabled = ${settings.enabled}, max_characters = ${settings.maxCharacters},
            allow_letters = ${settings.allowLetters}, allow_numbers = ${settings.allowNumbers},
            allow_spaces = ${settings.allowSpaces}, allowed_symbols = ${settings.allowedSymbols},
            help_text = ${settings.helpText}, updated_at = now()
          WHERE id = 1
        `,
        tx`DELETE FROM engraving_categories`,
      ];
      if (categoryIds.length > 0) {
        statements.push(tx`
          INSERT INTO engraving_categories (category_id)
          SELECT id FROM categories WHERE id = ANY(${categoryIds}::uuid[])
        `);
      }
      statements.push(tx`DELETE FROM engraving_fonts WHERE NOT (id = ANY(${fonts.map((font) => font.id)}::text[]))`);
      for (const font of fonts) {
        statements.push(tx`
          INSERT INTO engraving_fonts (id, name, font_family, google_font, is_enabled, position)
          VALUES (${font.id}, ${font.name}, ${font.fontFamily}, ${font.googleFont || null}, ${font.enabled}, ${font.position})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name, font_family = EXCLUDED.font_family, google_font = EXCLUDED.google_font,
            is_enabled = EXCLUDED.is_enabled, position = EXCLUDED.position, updated_at = now()
        `);
      }
      return statements;
    });
  } catch (error) {
    throw translateMissingTables(error);
  }

  return getEngravingAdminConfig();
}
