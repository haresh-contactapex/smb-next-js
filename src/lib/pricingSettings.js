import { sql } from "./db";

function toPublicSettings(row) {
  return {
    adjustmentValue: String(row.adjustment_value),
    adjustmentType: row.adjustment_type,
    adjustmentDirection: row.adjustment_direction,
  };
}

export async function getPricingSettings() {
  const [row] = await sql`SELECT * FROM pricing_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function updatePricingSettings(settings) {
  const [row] = await sql`
    UPDATE pricing_settings SET
      adjustment_value = ${settings.adjustmentValue},
      adjustment_type = ${settings.adjustmentType},
      adjustment_direction = ${settings.adjustmentDirection},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}
