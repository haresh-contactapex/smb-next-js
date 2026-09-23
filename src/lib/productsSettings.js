import { sql } from "./db";

function toPublicSettings(row) {
  return {
    skuPrefix: row.sku_prefix || "",
    defaultStatus: row.default_status,
    defaultWeightUnit: row.default_weight_unit,
    allowBackorders: row.allow_backorders,
    allowReviews: row.allow_reviews,
    showLowStockBadge: row.show_low_stock_badge,
    lowStockThreshold: String(row.low_stock_threshold),
  };
}

export async function getProductsSettings() {
  const [row] = await sql`SELECT * FROM products_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function updateProductsSettings(settings) {
  const [row] = await sql`
    UPDATE products_settings SET
      sku_prefix = ${settings.skuPrefix || null},
      default_status = ${settings.defaultStatus},
      default_weight_unit = ${settings.defaultWeightUnit},
      allow_backorders = ${settings.allowBackorders},
      allow_reviews = ${settings.allowReviews},
      show_low_stock_badge = ${settings.showLowStockBadge},
      low_stock_threshold = ${settings.lowStockThreshold},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;

  // Settings -> Shipping's "Weight Unit" defaults to this value; keep it in
  // sync whenever the Products default changes. Swallowed if shipping_settings
  // hasn't been migrated yet in this environment, so Products settings can
  // still be saved on its own.
  try {
    await sql`UPDATE shipping_settings SET weight_unit = ${settings.defaultWeightUnit}, updated_at = now() WHERE id = 1`;
  } catch {
    // shipping_settings not present yet — nothing to sync.
  }

  return toPublicSettings(row);
}
