import { signJwt, verifyJwt } from "./jwt";
import { setAuthCookie, getAuthCookie, clearAuthCookie } from "./cookies";
import { STAFF_SESSION_COOKIE, STAFF_SESSION_SCOPE } from "./constants";
import { getStaffById } from "../staff";

const TTL = "12h";
const MAX_AGE_SECONDS = 12 * 60 * 60;

export async function createStaffSession(userId) {
  const token = await signJwt({ sub: userId, scope: STAFF_SESSION_SCOPE }, TTL);
  await setAuthCookie(STAFF_SESSION_COOKIE, token, { maxAgeSeconds: MAX_AGE_SECONDS });
}

// RootLayout calls this on every page render (including the login page
// itself), so a transient DB hiccup (e.g. a Neon cold start) must not crash
// the whole app — fall back to "no session" the same way an invalid/expired
// token does, rather than throwing.
export async function getCurrentStaffUser() {
  const token = await getAuthCookie(STAFF_SESSION_COOKIE);
  const payload = await verifyJwt(token);
  if (!payload || payload.scope !== STAFF_SESSION_SCOPE || !payload.sub) return null;
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
