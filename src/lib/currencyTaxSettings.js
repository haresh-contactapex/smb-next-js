import { sql } from "./db";

function toPublicSettings(row) {
  return {
    currency: row.currency,
    currencyPosition: row.currency_position,
    numberFormat: row.number_format,
    pricesIncludeTax: row.prices_include_tax,
    defaultTaxRate: String(row.default_tax_rate),
    taxRegistrationNumber: row.tax_registration_number || "",
    applyTaxToShipping: row.apply_tax_to_shipping,
    enableTaxExemptGroups: row.enable_tax_exempt_groups,
  };
}

export async function getCurrencyTaxSettings() {
  const [row] = await sql`SELECT * FROM currency_tax_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function updateCurrencyTaxSettings(settings) {
  const [row] = await sql`
    UPDATE currency_tax_settings SET
      currency = ${settings.currency},
      currency_position = ${settings.currencyPosition},
      number_format = ${settings.numberFormat},
      prices_include_tax = ${settings.pricesIncludeTax},
      default_tax_rate = ${settings.defaultTaxRate},
      tax_registration_number = ${settings.taxRegistrationNumber || null},
      apply_tax_to_shipping = ${settings.applyTaxToShipping},
      enable_tax_exempt_groups = ${settings.enableTaxExemptGroups},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}
