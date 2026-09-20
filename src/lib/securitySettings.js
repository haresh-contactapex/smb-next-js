import { sql } from "./db";

function toPublicSettings(row) {
  return {
    requireTwoFactorAuth: row.require_two_factor_auth,
    sessionTimeoutMinutes: row.session_timeout_minutes,
    passwordExpiryDays: row.password_expiry_days,
    maxLoginAttempts: row.max_login_attempts,
    ipAllowlist: row.ip_allowlist || "",
    enableRecaptcha: row.enable_recaptcha,
  };
}

export async function getSecuritySettings() {
  const [row] = await sql`SELECT * FROM security_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function updateSecuritySettings(settings) {
  const [row] = await sql`
    UPDATE security_settings SET
      require_two_factor_auth = ${settings.requireTwoFactorAuth},
      session_timeout_minutes = ${settings.sessionTimeoutMinutes},
      password_expiry_days = ${settings.passwordExpiryDays},
      max_login_attempts = ${settings.maxLoginAttempts},
      ip_allowlist = ${settings.ipAllowlist || null},
      enable_recaptcha = ${settings.enableRecaptcha},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}
