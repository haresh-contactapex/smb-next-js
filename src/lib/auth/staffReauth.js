import { getStaffPasswordHash } from "../staff";
import { verifyPassword } from "./password";
import { createRateLimiter } from "../rateLimit";

// Per server instance, like the other limiters in the app: a speed bump, not a hard cap, so
// a hijacked session can't be used to guess the password through the profile endpoints.
const allowAttempt = createRateLimiter({ limit: 8, windowMs: 15 * 60 * 1000 });

// Checks the signed-in staff member's current password before a sensitive change. Returns
// null when it matches, otherwise { status, error, field } for the route to answer with.
export async function checkStaffCurrentPassword(staffId, password) {
  if (!allowAttempt(staffId)) {
    return { status: 429, error: "Too many attempts. Please wait a few minutes and try again.", field: "currentPassword" };
  }
  if (!password) {
    return { status: 400, error: "Enter your current password to confirm this change.", field: "currentPassword" };
  }
  const matches = await verifyPassword(String(password), await getStaffPasswordHash(staffId));
  if (!matches) return { status: 400, error: "Current password is incorrect.", field: "currentPassword" };
  return null;
}
