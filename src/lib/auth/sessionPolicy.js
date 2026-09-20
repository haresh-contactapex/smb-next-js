import { sql } from "@/lib/db";

// One round trip for both the live Settings -> Security policy and this
// staff member's password age. Used by both the (Edge) middleware and
// getCurrentStaffUser so a change to Session Timeout or Password Expiry is
// enforced on a session that's already open, not just on the next login.
export async function getStaffSecurityPolicy(userId) {
  const [row] = await sql`
    SELECT
      s.session_timeout_minutes,
      s.password_expiry_days,
      u.password_changed_at
    FROM security_settings s
    CROSS JOIN users u
    WHERE s.id = 1 AND u.id = ${userId}
  `;
  if (!row) return null;
  return {
    sessionTimeoutMinutes: row.session_timeout_minutes,
    passwordExpiryDays: row.password_expiry_days,
    passwordChangedAt: row.password_changed_at,
  };
}

export function isSessionTimedOut(issuedAtSeconds, sessionTimeoutMinutes) {
  if (!issuedAtSeconds || !sessionTimeoutMinutes || sessionTimeoutMinutes <= 0) return false;
  return Date.now() - issuedAtSeconds * 1000 >= sessionTimeoutMinutes * 60 * 1000;
}

export function isPasswordExpired(passwordChangedAt, passwordExpiryDays) {
  if (!passwordChangedAt || !passwordExpiryDays || passwordExpiryDays <= 0) return false;
  return Date.now() - new Date(passwordChangedAt).getTime() >= passwordExpiryDays * 24 * 60 * 60 * 1000;
}
