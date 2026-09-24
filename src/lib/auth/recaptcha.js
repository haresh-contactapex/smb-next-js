import { getSecuritySettings } from "@/lib/securitySettings";
import { getIntegrationsSettings } from "@/lib/integrationsSettings";

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

// `secret` lets a caller pass the Settings -> Integrations "Google reCAPTCHA"
// secret key; falls back to the env var when that integration isn't
// configured, so a deployment with no database row still works from
// .env.local alone.
export async function verifyRecaptcha(token, secret) {
  const resolvedSecret = secret || process.env.RECAPTCHA_SECRET_KEY;
  if (!resolvedSecret) {
    console.error("verifyRecaptcha: no reCAPTCHA secret key configured (Settings -> Integrations or RECAPTCHA_SECRET_KEY) — treating the token as unverified.");
    return false;
  }
  if (!token) return false;

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: resolvedSecret, response: token }),
    });
    const data = await response.json();
    return Boolean(data.success);
  } catch (error) {
    console.error("verifyRecaptcha: request to Google failed", error);
    return false;
  }
}

// A token is required only when BOTH Settings -> Security's "Enable
// reCAPTCHA on login and checkout" toggle AND Settings -> Integrations'
// "Google reCAPTCHA" toggle are on — the former is the site-wide security
// policy, the latter is whether the Google reCAPTCHA integration itself is
// turned on. Routes call this once instead of each re-implementing the
// "read the settings, then verify" sequence. Fails closed (not required) if
// a setting can't be read, same fallback used elsewhere for settings reads.
export async function checkRecaptchaIfEnabled(token) {
  let settings;
  try {
    settings = await getSecuritySettings();
  } catch {
    return { required: false, valid: true };
  }
  if (!settings?.enableRecaptcha) return { required: false, valid: true };

  let integrations;
  try {
    integrations = await getIntegrationsSettings();
  } catch {
    integrations = null;
  }
  if (!integrations?.googleRecaptchaEnabled) return { required: false, valid: true };

  // The Integrations secret key wins when one is set; otherwise
  // verifyRecaptcha() falls back to RECAPTCHA_SECRET_KEY from .env.local.
  const secret = integrations.googleRecaptchaSecretKey || undefined;

  return { required: true, valid: await verifyRecaptcha(token, secret) };
}
