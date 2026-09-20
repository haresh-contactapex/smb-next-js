import { signJwt, verifyJwt } from "./jwt";
import { setAuthCookie, getAuthCookie, clearAuthCookie } from "./cookies";
import { STAFF_SESSION_COOKIE, STAFF_SESSION_SCOPE } from "./constants";
import { getStaffById } from "../staff";
import { getSecuritySettings } from "../securitySettings";
import { getStaffSecurityPolicy, isSessionTimedOut } from "./sessionPolicy";

// Fallback TTL used only when Settings -> Security's session timeout can't be
// read (e.g. the table isn't migrated yet) — never blocks a login.
const DEFAULT_TTL_MINUTES = 12 * 60;

export async function createStaffSession(userId) {
  let ttlMinutes = DEFAULT_TTL_MINUTES;
  try {
    const settings = await getSecuritySettings();
    if (settings?.sessionTimeoutMinutes > 0) ttlMinutes = settings.sessionTimeoutMinutes;
  } catch {
    // Settings unreadable — fall back to the default TTL above.
  }
  const token = await signJwt({ sub: userId, scope: STAFF_SESSION_SCOPE }, `${ttlMinutes}m`);
  await setAuthCookie(STAFF_SESSION_COOKIE, token, { maxAgeSeconds: ttlMinutes * 60 });
}

// RootLayout calls this on every page render (including the login page
// itself), so a transient DB hiccup (e.g. a Neon cold start) must not crash
// the whole app — fall back to "no session" the same way an invalid/expired
// token does, rather than throwing.
export async function getCurrentStaffUser() {
  const token = await getAuthCookie(STAFF_SESSION_COOKIE);
  const payload = await verifyJwt(token);
  if (!payload || payload.scope !== STAFF_SESSION_SCOPE || !payload.sub) return null;

  // Re-checked against the *current* setting (not just the token's own
  // expiry) so lowering Session Timeout logs an already-open session out
  // without waiting for a fresh login. Middleware protects page navigation;
  // this covers API routes and server components, which middleware doesn't.
  try {
    const policy = await getStaffSecurityPolicy(payload.sub);
    if (policy && isSessionTimedOut(payload.iat, policy.sessionTimeoutMinutes)) {
      await clearStaffSession();
      return null;
    }
  } catch (error) {
    console.error("getCurrentStaffUser: failed to check session timeout", error);
  }

  try {
    return await getStaffById(payload.sub);
  } catch (error) {
    console.error("getCurrentStaffUser: failed to load staff user", error);
    return null;
  }
}

export async function clearStaffSession() {
  await clearAuthCookie(STAFF_SESSION_COOKIE);
}
