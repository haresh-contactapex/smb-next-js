import { signJwt, verifyJwt } from "./jwt";
import { setAuthCookie, getAuthCookie, clearAuthCookie } from "./cookies";
import { STAFF_2FA_CHALLENGE_COOKIE, STAFF_2FA_CHALLENGE_SCOPE } from "./constants";

// Long enough to cover a couple of resends; the code itself still expires
// in OTP_TTL_MS (loginOtp.js), which is what actually limits the window.
const CHALLENGE_TTL_MINUTES = 10;

// Issued once the password check passes but before the OTP is verified, so
// /api/admin-auth/verify-otp and /resend-otp know which account a code
// belongs to without re-sending the password.
export async function createStaffTwoFactorChallenge(userId) {
  const token = await signJwt({ sub: userId, scope: STAFF_2FA_CHALLENGE_SCOPE }, `${CHALLENGE_TTL_MINUTES}m`);
  await setAuthCookie(STAFF_2FA_CHALLENGE_COOKIE, token, { maxAgeSeconds: CHALLENGE_TTL_MINUTES * 60 });
}

// Returns the pending user's id, or null if there's no valid challenge.
export async function getStaffTwoFactorChallengeUserId() {
  const token = await getAuthCookie(STAFF_2FA_CHALLENGE_COOKIE);
  const payload = await verifyJwt(token);
  if (!payload || payload.scope !== STAFF_2FA_CHALLENGE_SCOPE || !payload.sub) return null;
  return payload.sub;
}

export async function clearStaffTwoFactorChallenge() {
  await clearAuthCookie(STAFF_2FA_CHALLENGE_COOKIE);
}
