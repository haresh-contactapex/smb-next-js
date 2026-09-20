import { sql } from "./db";

function toPublicSettings(row) {
  return {
    storeName: row.store_name,
    logoUrl: row.logo_url || null,
    faviconUrl: row.favicon_url || null,
    storeEmail: row.store_email,
    phone: row.phone || "",
    address: row.address || "",
    country: row.country,
    state: row.state || "",
    city: row.city || "",
    zip: row.postal_code || "",
    timezone: row.timezone,
    dateTimeFormat: row.date_time_format,
    language: row.language,
  };
}

export async function getGeneralSettings() {
  const [row] = await sql`SELECT * FROM general_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function updateGeneralSettings(settings) {
  const [row] = await sql`
    UPDATE general_settings SET
      store_name = ${settings.storeName},
      logo_url = ${settings.logoUrl || null},
      favicon_url = ${settings.faviconUrl || null},
      store_email = ${settings.storeEmail},
      phone = ${settings.phone || null},
      address = ${settings.address || null},
      country = ${settings.country},
      state = ${settings.state || null},
      city = ${settings.city || null},
      postal_code = ${settings.zip || null},
      timezone = ${settings.timezone},
      date_time_format = ${settings.dateTimeFormat},
      language = ${settings.language},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}
