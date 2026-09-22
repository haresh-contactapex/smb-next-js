import { sql } from "./db";

function toPublicSettings(row) {
  return {
    maintenanceModeEnabled: row.maintenance_mode_enabled,
    maintenanceMessage: row.maintenance_message || "",
    debugModeEnabled: row.debug_mode_enabled,
  };
}

export async function getSystemMaintenanceSettings() {
  const [row] = await sql`SELECT * FROM system_maintenance_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function updateSystemMaintenanceSettings(settings) {
  const [row] = await sql`
    UPDATE system_maintenance_settings SET
      maintenance_mode_enabled = ${settings.maintenanceModeEnabled},
      maintenance_message = ${settings.maintenanceMessage},
      debug_mode_enabled = ${settings.debugModeEnabled},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}

const DEFAULT_MAINTENANCE_MESSAGE = "We'll be back soon — thanks for your patience!";

// Customer-facing storefront entry points (the /login, /register,
// /forgot-password, /reset-password pages via middleware, and their API
// routes directly) call this once instead of each re-implementing "read the
// setting, then decide" — mirrors checkRecaptchaIfEnabled's shape. Fails
// open (not active) if the setting can't be read, same fallback used
// elsewhere for settings reads, so a DB hiccup never accidentally locks out
// the storefront. Staff/admin routes never call this — maintenance mode
// only blocks storefront visitors, admins keep access.
export async function checkMaintenanceMode() {
  let settings;
  try {
    settings = await getSystemMaintenanceSettings();
  } catch {
    return { active: false, message: "" };
  }
  if (!settings?.maintenanceModeEnabled) return { active: false, message: "" };
  return { active: true, message: settings.maintenanceMessage.trim() || DEFAULT_MAINTENANCE_MESSAGE };
}
