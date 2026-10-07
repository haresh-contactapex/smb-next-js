import { sql } from "./db";
import { isMissingRelation } from "./accountError";
import { rowToFont, rowToSettings, EngravingError } from "./engravingSettings";
import { normalizeEngravingMode, resolveEngravingAvailability, validateEngravingText } from "./engravingRules";

// The storefront's side of engraving: is it offered on this product, what the product page
// shows, and what the checkout accepts. The admin's side (settings, fonts, categories) is
// engravingSettings.js; the text rules and the eligibility priority are engravingRules.js.
// See docs/engraving/engraving.md.
//
// Every read here treats "the engraving tables were never migrated" as "engraving is off", so
// an environment that hasn't run `npm run db:migrate:engraving` keeps working exactly as before.

// The rules and the enabled fonts the storefront works from, or null when engraving is off or
// not set up. Only enabled fonts: a disabled font can no longer be chosen or ordered.
export async function loadEngravingRuntime() {
  try {
    const [settingsRows, fontRows] = await Promise.all([
      sql`SELECT * FROM engraving_settings WHERE id = 1`,
      sql`SELECT * FROM engraving_fonts WHERE is_enabled = true ORDER BY position, name`,
    ]);
    if (!settingsRows[0]) return null;
    const settings = rowToSettings(settingsRows[0]);
    if (!settings.enabled) return null;
    return { settings, fonts: fontRows.map(rowToFont) };
  } catch (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
}

// What the browser needs to show and check the engraving form. Nothing internal.
function toPublicConfig(runtime) {
  const { settings } = runtime;
  return {
    settings: {
      maxCharacters: settings.maxCharacters,
      allowLetters: settings.allowLetters,
      allowNumbers: settings.allowNumbers,
      allowSpaces: settings.allowSpaces,
      allowedSymbols: settings.allowedSymbols,
      helpText: settings.helpText,
    },
    fonts: runtime.fonts.map((font) => ({ id: font.id, name: font.name, fontFamily: font.fontFamily, googleFont: font.googleFont })),
  };
}

// The rules and fonts for the cart page's edit form. null when engraving is off, or there is
// no font to choose.
export async function getPublicEngravingConfig() {
  try {
    const runtime = await loadEngravingRuntime();
    return runtime && runtime.fonts.length > 0 ? toPublicConfig(runtime) : null;
  } catch (error) {
    console.error("Engraving config failed to load", error);
    return null;
  }
}

// For each product: its own engraving setting, and whether it sits in an engraving category
// (a category of its own, or any sub-category of one). A product is in a category through
// products.category_id or through product_categories, as everywhere else in the catalog.
async function queryProductEngravingState(productIds) {
  if (productIds.length === 0) return [];
  return sql`
    WITH RECURSIVE tree AS (
      SELECT category_id AS id FROM engraving_categories
      UNION
      SELECT c.id FROM categories c JOIN tree t ON c.parent_id = t.id
    )
    SELECT
      p.id,
      p.engraving_mode,
      (
        COALESCE(p.category_id IN (SELECT id FROM tree), false)
        OR EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id IN (SELECT id FROM tree))
      ) AS in_enabled_category
    FROM products p
    WHERE p.id = ANY(${productIds}::uuid[])
  `;
}

const stateToAvailability = (state, globalEnabled = true) =>
  resolveEngravingAvailability({
    globalEnabled,
    productMode: state?.engraving_mode,
    inEnabledCategory: Boolean(state?.in_enabled_category),
  });

// The engraving options for one product page, or null when the product doesn't offer engraving.
// `source` is how it got there ("product-enabled" or "category"). Never throws: engraving is an
// extra, so a failure is logged and the product page simply renders without it.
export async function getProductEngraving(productId) {
  try {
    const runtime = await loadEngravingRuntime();
    if (!runtime || runtime.fonts.length === 0) return null;
    const [state] = await queryProductEngravingState([productId]);
    const availability = stateToAvailability(state);
    return availability.available ? { ...toPublicConfig(runtime), source: availability.source } : null;
  } catch (error) {
    if (!isMissingRelation(error)) console.error("Product engraving failed to load", error);
    return null;
  }
}

// Writes a product's own engraving setting. Called after the product itself has been saved.
export async function setProductEngravingMode(productId, mode) {
  const value = normalizeEngravingMode(mode);
  try {
    await sql`UPDATE products SET engraving_mode = ${value} WHERE id = ${productId}`;
  } catch (error) {
    // Nothing to store before the migration, and "inherit" is what a missing column means.
    if (isMissingRelation(error)) {
      if (value === "inherit") return;
      throw new EngravingError("The engraving columns are missing. Run `npm run db:migrate:engraving` and save again.", 503);
    }
    throw error;
  }
}

// --- Orders ------------------------------------------------------------------------------------

// The engraving recorded on each line of an order, as a Map of order line id ->
// { enabled, text, fontId, fontName }. Lines without engraving are not in it. Empty before the
// engraving migration, so an older database still shows its orders.
export async function loadOrderLineEngravings(orderId) {
  try {
    const rows = await sql`
      SELECT id, engraving_text, engraving_font_id, engraving_font_name
      FROM order_line_items
      WHERE order_id = ${orderId} AND engraving_enabled = true
    `;
    return new Map(
      rows.map((row) => [
        row.id,
        { enabled: true, text: row.engraving_text || "", fontId: row.engraving_font_id || "", fontName: row.engraving_font_name || "" },
      ])
    );
  } catch (error) {
    if (isMissingRelation(error)) return new Map();
    throw error;
  }
}

// --- Checkout ------------------------------------------------------------------------------

// Loads what resolveLineEngraving() needs for the cart's engraved lines, in one go.
export async function loadCheckoutEngravingContext(productIds) {
  const runtime = await loadEngravingRuntime();
  if (!runtime) return { runtime: null, states: new Map() };
  const rows = await queryProductEngravingState(productIds);
  return { runtime, states: new Map(rows.map((row) => [row.id, row])) };
}

// Decides whether one engraved cart line can be ordered, from the store's current settings and
// never from anything the browser claims: engraving is on, the product offers it, the text
// passes the rules, and the font exists and is enabled. The font's name comes from the store,
// not the request.
// Returns { ok: true, engraving: { enabled, text, fontId, fontName } } or { ok: false, reason }.
export function resolveLineEngraving(engraving, productId, { runtime, states }) {
  if (!runtime) return { ok: false, reason: "Engraving isn't available right now." };

  if (!stateToAvailability(states.get(productId)).available) {
    return { ok: false, reason: "Engraving isn't available for this product." };
  }

  const checked = validateEngravingText(engraving.text, runtime.settings);
  if (checked.empty) return { ok: false, reason: "The engraving text is empty." };
  if (!checked.ok) return { ok: false, reason: checked.error };

  const font = runtime.fonts.find((candidate) => candidate.id === engraving.fontId);
  if (!font) return { ok: false, reason: "The engraving font you chose is no longer available." };

  return { ok: true, engraving: { enabled: true, text: checked.text, fontId: font.id, fontName: font.name } };
}
