import { signJwt, verifyJwt } from "./jwt";
import { setAuthCookie, getAuthCookie, clearAuthCookie } from "./cookies";
import { CUSTOMER_2FA_CHALLENGE_COOKIE, CUSTOMER_2FA_CHALLENGE_SCOPE } from "./constants";

// Long enough to cover a couple of resends; the code itself still expires
// in OTP_TTL_MS (loginOtp.js), which is what actually limits the window.
const CHALLENGE_TTL_MINUTES = 10;

// Issued once the password check passes but before the code is verified, so
// /api/auth/verify-otp and /resend-otp know which account a code belongs to
// without re-sending the password. It also remembers the "Remember me" choice
// made on the sign-in form, which the session created at the end still honors.
export async function createCustomerTwoFactorChallenge(customerId, { rememberMe = false } = {}) {
  const token = await signJwt(
    { sub: customerId, scope: CUSTOMER_2FA_CHALLENGE_SCOPE, rememberMe: Boolean(rememberMe) },
    `${CHALLENGE_TTL_MINUTES}m`
  );
  await setAuthCookie(CUSTOMER_2FA_CHALLENGE_COOKIE, token, { maxAgeSeconds: CHALLENGE_TTL_MINUTES * 60 });
}

// Returns { customerId, rememberMe }, or null if there's no valid challenge.
export async function getCustomerTwoFactorChallenge() {
  const token = await getAuthCookie(CUSTOMER_2FA_CHALLENGE_COOKIE);
  const payload = await verifyJwt(token);
  if (!payload || payload.scope !== CUSTOMER_2FA_CHALLENGE_SCOPE || !payload.sub) return null;
  return { customerId: payload.sub, rememberMe: Boolean(payload.rememberMe) };
}

export async function clearCustomerTwoFactorChallenge() {
  await clearAuthCookie(CUSTOMER_2FA_CHALLENGE_COOKIE);
}
