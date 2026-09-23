import { sql } from "./db";

function toPublicSettings(row) {
  return {
    defaultCarrier: row.default_carrier,
    flatRateFee: String(row.flat_rate_fee),
    freeShippingThreshold: String(row.free_shipping_threshold),
    processingTimeDays: String(row.processing_time_days),
    weightUnit: row.weight_unit,
    dimensionUnit: row.dimension_unit,
    localPickupEnabled: row.local_pickup_enabled,
  };
}

export async function getShippingSettings() {
  const [row] = await sql`SELECT * FROM shipping_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function updateShippingSettings(settings) {
  const [row] = await sql`
    UPDATE shipping_settings SET
      default_carrier = ${settings.defaultCarrier},
      flat_rate_fee = ${settings.flatRateFee},
      free_shipping_threshold = ${settings.freeShippingThreshold},
      processing_time_days = ${settings.processingTimeDays},
      weight_unit = ${settings.weightUnit},
      dimension_unit = ${settings.dimensionUnit},
      local_pickup_enabled = ${settings.localPickupEnabled},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}
