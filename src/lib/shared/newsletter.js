// Pure helpers for the home page "Stay in the Loop" signup. Shared by the form (live
// feedback) and /api/newsletter (the real check), so both sides agree on what is valid.
// Nothing here touches the server or DOM.
//
// The address is the only thing a visitor types, and it ends up in a database row, an email's
// To header, an HTML email and a CSV file. So it is held to a strict allowlist instead of
// "anything that looks roughly like an address": plain ASCII, no whitespace, no control
// characters (a NUL byte is rejected by Postgres, a newline could add a mail header), no
// brackets, quotes, commas or semicolons (so it can never read as a second recipient or a
// display name). The values still go to the database only as bound parameters, never as SQL text.

export const NEWSLETTER_LIMITS = { email: 254, localPart: 64 };

const LOCAL_PART = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

// Addresses are compared without regard to case, so they are stored lower-case. Anything that
// is not a string (an array, an object, a number from a hand-made request) becomes "" instead
// of being coerced into text that might happen to pass.
export function normalizeNewsletterEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidNewsletterEmail(email) {
  if (email.length > NEWSLETTER_LIMITS.email) return false;
  const at = email.indexOf("@");
  if (at < 1 || at !== email.lastIndexOf("@")) return false;

  const local = email.slice(0, at);
  const labels = email.slice(at + 1).split(".");
  return (
    local.length <= NEWSLETTER_LIMITS.localPart &&
    LOCAL_PART.test(local) &&
    labels.length >= 2 &&
    labels.every((label) => DOMAIN_LABEL.test(label)) &&
    /[a-z]{2,}$/.test(labels[labels.length - 1])
  );
}

// Returns an error message, or "" when the address is fine. Expects a normalized address.
export function validateNewsletterEmail(email) {
  if (!email) return "Please enter your email address.";
  if (!isValidNewsletterEmail(email)) return "Enter a valid email address.";
  return "";
}
