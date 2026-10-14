import { signJwt, verifyJwt } from "./jwt";
import { setAuthCookie, getAuthCookie, clearAuthCookie } from "./cookies";
import { CUSTOMER_SESSION_COOKIE, CUSTOMER_SESSION_SCOPE } from "./constants";
import { getCustomerForSession } from "../customers";
import { isTokenRevoked } from "./sessionPolicy";
import { revokeCustomerSessions } from "./sessionRevocation";

const DEFAULT_TTL = "1d";
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const REMEMBER_TTL = "30d";
const REMEMBER_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// rememberMe unchecked => browser-session cookie (cleared on browser close),
// but the JWT itself still expires after a day as a safety net.
export async function createCustomerSession(customerId, { rememberMe = false } = {}) {
  const token = await signJwt(
    { sub: customerId, scope: CUSTOMER_SESSION_SCOPE },
    rememberMe ? REMEMBER_TTL : DEFAULT_TTL
  );
  await setAuthCookie(CUSTOMER_SESSION_COOKIE, token, {
    maxAgeSeconds: rememberMe ? REMEMBER_MAX_AGE_SECONDS : undefined,
  });
}

// A transient DB hiccup (e.g. a Neon cold start) should surface as "no
// session" rather than a 500 — the same fallback an invalid/expired token
// already gets. See getCurrentStaffUser for why this matters even more for
// the staff-session equivalent, which RootLayout calls on every render.
export async function getCurrentCustomer() {
  const token = await getAuthCookie(CUSTOMER_SESSION_COOKIE);
  const payload = await verifyJwt(token);
  if (!payload || payload.scope !== CUSTOMER_SESSION_SCOPE || !payload.sub) return null;
  try {
    const found = await getCustomerForSession(payload.sub);
    if (!found || isTokenRevoked(payload.iat, found.sessionsValidAfter)) return null;
    return found.customer;
  } catch (error) {
    console.error("getCurrentCustomer: failed to load customer", error);
    return null;
  }
}

// After a password change: signs out every other device (see revokeCustomerSessions) and
// gives this one a new session of the same kind (remember-me or not) so it stays signed in.
export async function refreshCustomerSessionAfterPasswordChange(customerId) {
  const payload = await verifyJwt(await getAuthCookie(CUSTOMER_SESSION_COOKIE));
  const rememberMe = Boolean(payload?.exp && payload?.iat && payload.exp - payload.iat > DEFAULT_TTL_SECONDS);
  await createCustomerSession(customerId, { rememberMe });
}

// Logout: clears this browser's cookie and invalidates the token itself, so a copy of it
// stops working. Other devices are signed out too (the token carries no session id of its own).
export async function endCustomerSession() {
  const payload = await verifyJwt(await getAuthCookie(CUSTOMER_SESSION_COOKIE));
  if (payload?.scope === CUSTOMER_SESSION_SCOPE && payload.sub) {
    await revokeCustomerSessions(payload.sub).catch((error) => console.error("endCustomerSession: could not revoke", error));
  }
  await clearCustomerSession();
}

export async function clearCustomerSession() {
  await clearAuthCookie(CUSTOMER_SESSION_COOKIE);
}
