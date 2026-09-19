import { signJwt, verifyJwt } from "./jwt";
import { setAuthCookie, getAuthCookie, clearAuthCookie } from "./cookies";
import { CUSTOMER_SESSION_COOKIE, CUSTOMER_SESSION_SCOPE } from "./constants";
import { getCustomerById } from "../customers";

const DEFAULT_TTL = "1d";
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
    return await getCustomerById(payload.sub);
  } catch (error) {
    console.error("getCurrentCustomer: failed to load customer", error);
    return null;
  }
}

export async function clearCustomerSession() {
  await clearAuthCookie(CUSTOMER_SESSION_COOKIE);
}
