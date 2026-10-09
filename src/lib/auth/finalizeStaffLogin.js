import { createStaffSession } from "./staffSession";
import { touchStaffLastLogin, toPublicStaffUser } from "../staff";
import { logAdminActivity } from "../notifications";

// The last step of a staff sign-in, shared by a direct login (no 2FA
// required) and a login completed via /api/admin-auth/verify-otp: creates
// the session cookie, stamps Last Login, and logs one "auth.login" activity.
// `staffUser` is the raw `users` row (needs first_name/last_name/password_hash's
// sibling columns, not the camelCase public shape).
export async function finalizeStaffLogin(staffUser) {
  await createStaffSession(staffUser.id);
  await touchStaffLastLogin(staffUser.id);
  await logAdminActivity({
    actor: toPublicStaffUser(staffUser),
    action: "auth.login",
    entityType: "auth",
    entityId: staffUser.id,
    title: "Admin signed in",
    description: `${staffUser.first_name} ${staffUser.last_name} signed in.`,
  });
  return toPublicStaffUser(staffUser);
}
