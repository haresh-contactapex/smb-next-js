import { sql } from "./db";

function toPublicSettings(row) {
  return {
    googleAnalyticsEnabled: row.google_analytics_enabled,
    googleAnalyticsId: row.google_analytics_id || "",
    metaPixelEnabled: row.meta_pixel_enabled,
    metaPixelId: row.meta_pixel_id || "",
    mailchimpEnabled: row.mailchimp_enabled,
    mailchimpApiKey: row.mailchimp_api_key || "",
    googleRecaptchaEnabled: row.google_recaptcha_enabled,
    googleRecaptchaSiteKey: row.google_recaptcha_site_key || "",
    googleRecaptchaSecretKey: row.google_recaptcha_secret_key || "",
  };
}

export async function getIntegrationsSettings() {
  const [row] = await sql`SELECT * FROM integrations_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function updateIntegrationsSettings(settings) {
  const [row] = await sql`
    UPDATE integrations_settings SET
      google_analytics_enabled = ${settings.googleAnalyticsEnabled},
      google_analytics_id = ${settings.googleAnalyticsId || null},
      meta_pixel_enabled = ${settings.metaPixelEnabled},
      meta_pixel_id = ${settings.metaPixelId || null},
      mailchimp_enabled = ${settings.mailchimpEnabled},
      mailchimp_api_key = ${settings.mailchimpApiKey || null},
      google_recaptcha_enabled = ${settings.googleRecaptchaEnabled},
      google_recaptcha_site_key = ${settings.googleRecaptchaSiteKey || null},
      google_recaptcha_secret_key = ${settings.googleRecaptchaSecretKey || null},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}
