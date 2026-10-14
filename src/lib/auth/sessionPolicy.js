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
      u.password_changed_at,
      -- Read through the row's JSON so this still works before the sessions_valid_after column exists.
      to_jsonb(u) ->> 'sessions_valid_after' AS sessions_valid_after
    FROM security_settings s
    CROSS JOIN users u
    WHERE s.id = 1 AND u.id = ${userId}
  `;
  if (!row) return null;
  return {
    sessionTimeoutMinutes: row.session_timeout_minutes,
    passwordExpiryDays: row.password_expiry_days,
    passwordChangedAt: row.password_changed_at,
    sessionsValidAfter: row.sessions_valid_after,
  };
}

// Allowance for the app server's clock running slightly behind the database's, so a session
// issued right after a password change is never rejected as older than it.
const CLOCK_SKEW_SECONDS = 2;

// Whether a token was issued before the account's latest "sign everyone out" moment (a
// password change or reset, a logout). `cutoffs` are timestamps; missing ones are ignored.
export function isTokenRevoked(issuedAtSeconds, ...cutoffs) {
  let latest = 0;
  for (const cutoff of cutoffs) {
    const time = cutoff ? new Date(cutoff).getTime() : NaN;
    if (Number.isFinite(time) && time > latest) latest = time;
  }
  if (!latest) return false;
  if (!issuedAtSeconds) return true;
  return issuedAtSeconds < Math.floor(latest / 1000) - CLOCK_SKEW_SECONDS;
}

export function isSessionTimedOut(issuedAtSeconds, sessionTimeoutMinutes) {
  if (!issuedAtSeconds || !sessionTimeoutMinutes || sessionTimeoutMinutes <= 0) return false;
  return Date.now() - issuedAtSeconds * 1000 >= sessionTimeoutMinutes * 60 * 1000;
}

export function isPasswordExpired(passwordChangedAt, passwordExpiryDays) {
  if (!passwordChangedAt || !passwordExpiryDays || passwordExpiryDays <= 0) return false;
  return Date.now() - new Date(passwordChangedAt).getTime() >= passwordExpiryDays * 24 * 60 * 60 * 1000;
}
