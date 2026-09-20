import { getSecuritySettings } from "@/lib/securitySettings";

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error("verifyRecaptcha: RECAPTCHA_SECRET_KEY is not set — treating the token as unverified.");
    return false;
  }
  if (!token) return false;

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await response.json();
    return Boolean(data.success);
  } catch (error) {
    console.error("verifyRecaptcha: request to Google failed", error);
    return false;
  }
}

// Settings -> Security's "Enable reCAPTCHA on login and checkout" toggle
// gates whether a route needs to check a token at all. Routes call this
// once instead of each re-implementing the "read the setting, then verify"
// sequence. Fails closed (not required) if the setting can't be read, same
// fallback used elsewhere for settings reads.
export async function checkRecaptchaIfEnabled(token) {
  let settings;
  try {
    settings = await getSecuritySettings();
  } catch {
    return { required: false, valid: true };
  }
  if (!settings?.enableRecaptcha) return { required: false, valid: true };

  return { required: true, valid: await verifyRecaptcha(token) };
}
