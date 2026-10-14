import { sql } from "@/lib/db";

const LOCKOUT_MINUTES = 15;
// Used when Settings -> Security's "Max Login Attempts" is 0 (staff lockout off), so
// customer passwords are never open to unlimited guessing.
const DEFAULT_MAX_ATTEMPTS = 10;

// Columns come from docs/auth/customer-login-lockout-only.sql; until that is applied
// (undefined_column) lockout quietly does nothing instead of breaking sign-in.
const UNMIGRATED = "42703";

export function isCustomerLocked(row) {
  return Boolean(row?.locked_until && new Date(row.locked_until).getTime() > Date.now());
}

// One atomic statement so concurrent wrong guesses can't slip past the cap.
export async function registerFailedCustomerLogin(id, maxLoginAttempts) {
  const limit = maxLoginAttempts > 0 ? maxLoginAttempts : DEFAULT_MAX_ATTEMPTS;
  try {
    await sql`
      UPDATE customers SET
        failed_login_attempts = CASE WHEN failed_login_attempts + 1 >= ${limit} THEN 0 ELSE failed_login_attempts + 1 END,
        locked_until = CASE WHEN failed_login_attempts + 1 >= ${limit}
          THEN now() + make_interval(mins => ${LOCKOUT_MINUTES}) ELSE locked_until END
      WHERE id = ${id}
    `;
  } catch (error) {
    if (error?.code !== UNMIGRATED) throw error;
  }
}

export async function resetCustomerLoginAttempts(row) {
  if (!row.failed_login_attempts && !row.locked_until) return;
  try {
    await sql`UPDATE customers SET failed_login_attempts = 0, locked_until = NULL WHERE id = ${row.id}`;
  } catch (error) {
    if (error?.code !== UNMIGRATED) throw error;
  }
}
