import { sql } from "./db";

function toPublicSettings(row) {
  return {
    legalBusinessName: row.legal_business_name || "",
    businessType: row.business_type,
    storeUrl: row.store_url || "",
    taxId: row.tax_id || "",
    supportEmail: row.support_email || "",
    supportPhone: row.support_phone || "",
    supportHours: row.support_hours || "",
    storeIsLive: row.store_is_live,
  };
}

export async function getStoreSettings() {
  const [row] = await sql`SELECT * FROM store_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function updateStoreSettings(settings) {
  const [row] = await sql`
    UPDATE store_settings SET
      legal_business_name = ${settings.legalBusinessName || null},
      business_type = ${settings.businessType},
      store_url = ${settings.storeUrl || null},
      tax_id = ${settings.taxId || null},
      support_email = ${settings.supportEmail || null},
      support_phone = ${settings.supportPhone || null},
      support_hours = ${settings.supportHours || null},
      store_is_live = ${settings.storeIsLive},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}
