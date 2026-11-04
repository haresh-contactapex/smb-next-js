// Pure helpers for the home page "Stay in the Loop" signup. Shared by the form (live
// feedback) and /api/newsletter (the real check), so both sides agree on what is valid.
// Nothing here touches the server or DOM. The address rules are the "Ask a question" form's.

import { isValidEmail } from "./askQuestion";

// Addresses are compared without regard to case, so they are stored lower-case.
export function normalizeNewsletterEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

// Returns an error message, or "" when the address is fine.
export function validateNewsletterEmail(email) {
  if (!email) return "Please enter your email address.";
  if (!isValidEmail(email)) return "Enter a valid email address.";
  return "";
}
