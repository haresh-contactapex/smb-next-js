// Pure helpers for the storefront Contact form. Shared by the form (live field
// feedback) and /api/contact (the real check), so both sides agree on what is
// valid. Nothing here touches the server or DOM. The email and phone rules and
// the shared limits are the "Ask a question" form's; only the message differs.

import { QUESTION_LIMITS, isValidEmail } from "../ask-question/helpers";

export const CONTACT_LIMITS = {
  name: QUESTION_LIMITS.name,
  email: QUESTION_LIMITS.email,
  phone: QUESTION_LIMITS.phone,
  message: 2000,
};

// The store ships to US customers, so the phone number is a US one: ten digits, shown as
// (213) 290-9999. A leading country code (+1 or 1) is accepted and dropped.
export function usPhoneDigits(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 10 && digits.startsWith("1") ? digits.slice(1) : digits;
}

// Formats what has been typed so far, for live use as the visitor types: "21" -> "(21", "2132909999" -> "(213) 290-9999".
export function formatUsPhone(value) {
  const digits = usPhoneDigits(value).slice(0, 10);
  if (digits.length <= 3) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Area code and exchange never start with 0 or 1 in the North American numbering plan.
export function isValidUsPhone(value) {
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(usPhoneDigits(value));
}

export const EMPTY_CONTACT = { name: "", email: "", phone: "", message: "" };

// Order the fields appear in, so the first invalid one gets focus.
export const CONTACT_FIELDS = ["name", "email", "phone", "message"];

// Trims everything and flattens the name to one line (it ends up in an email
// subject and header). Works on anything a request body might contain.
export function normalizeContact(values) {
  return {
    name: String(values?.name ?? "").replace(/\s+/g, " ").trim(),
    email: String(values?.email ?? "").trim(),
    phone: formatUsPhone(values?.phone),
    message: String(values?.message ?? "").replace(/\r\n?/g, "\n").trim(),
  };
}

// Returns { field: message } for each invalid field; empty when everything is fine.
export function validateContact(values) {
  const errors = {};

  if (!values.name) errors.name = "Please enter your name.";
  else if (values.name.length > CONTACT_LIMITS.name) errors.name = `Your name can be at most ${CONTACT_LIMITS.name} characters.`;

  if (!values.email) errors.email = "Please enter your email address.";
  else if (!isValidEmail(values.email)) errors.email = "Please enter a valid email address.";

  if (!values.phone) errors.phone = "Please enter your phone number.";
  else if (!isValidUsPhone(values.phone)) errors.phone = "Please enter a valid US phone number, for example (213) 290-9999.";

  if (!values.message) errors.message = "Please enter your message.";
  else if (values.message.length > CONTACT_LIMITS.message) {
    errors.message = `Your message can be at most ${CONTACT_LIMITS.message} characters.`;
  }

  return errors;
}
