import { sql } from "@/lib/db";

// Sessions are stateless JWTs, so "sign out everywhere" works by stamping the account with
// a moment and rejecting every token issued before it (see isTokenRevoked). The column comes
// from docs/auth/session-revocation-only.sql; until it is applied (undefined_column) these
// do nothing instead of breaking logout and password changes.
const UNMIGRATED = "42703";

async function stamp(run) {
  try {
    await run();
  } catch (error) {
    if (error?.code !== UNMIGRATED) throw error;
  }
}

export function revokeStaffSessions(userId) {
  return stamp(() => sql`UPDATE users SET sessions_valid_after = now() WHERE id = ${userId}`);
}

export function revokeCustomerSessions(customerId) {
  return stamp(() => sql`UPDATE customers SET sessions_valid_after = now() WHERE id = ${customerId}`);
}
