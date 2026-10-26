// Pure helpers for the product page's "Ask a question" form. Shared by the
// form (live field feedback) and /api/product-questions (the real check), so
// both sides agree on what is valid. Nothing here touches the server or DOM.

import { formatUsPhone as formatUsPhoneDigits } from "@/lib/phone";

export const QUESTION_LIMITS = { name: 100, email: 254, phone: 30, question: 2000 };

export const EMPTY_QUESTION = { name: "", email: "", phone: "", question: "" };

// Order the fields appear in, so the first invalid one gets focus.
export const QUESTION_FIELDS = ["name", "email", "phone", "question"];

// Stricter than the auth helper: commas, semicolons, quotes and brackets are
// rejected so a value can never be read as a second recipient (or a display
// name) once it is used as the To address of the confirmation email.
const EMAIL_PATTERN = /^[^\s@,;:<>()[\]\\"]+@[^\s@,;:<>()[\]\\"]+\.[^\s@,;:<>()[\]\\"]+$/;

export function isValidEmail(value) {
  return value.length <= QUESTION_LIMITS.email && EMAIL_PATTERN.test(value);
}

// The store ships to US customers, so the phone number is a US one: ten digits, shown as
// (212) 555-0123. A leading country code (+1 or 1) is accepted and dropped.
export function usPhoneDigits(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 10 && digits.startsWith("1") ? digits.slice(1) : digits;
}

// Lays out what has been typed so far, for live use as the visitor types:
// "21" -> "(21", "2125550123" -> "(212) 555-0123". Digits past the tenth are ignored.
export function formatUsPhone(value) {
  return formatUsPhoneDigits(usPhoneDigits(value));
}

// Area code and exchange never start with 0 or 1 in the North American numbering plan.
export function isValidUsPhone(value) {
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(usPhoneDigits(value));
}

// A complete number is laid out as (212) 555-0123 whatever way it arrived (+1 212 555 0123,
// 212.555.0123...). Anything else is left as typed so validation rejects it, rather than
// extra digits being silently cut off and the leftover passing as a different number.
function normalizePhone(value) {
  const phone = String(value ?? "").trim();
  return isValidUsPhone(phone) ? formatUsPhone(phone) : phone;
}

// Trims everything and flattens the name to one line (it ends up in an email
// subject and header). Works on anything a request body might contain.
export function normalizeQuestion(values) {
  return {
    name: String(values?.name ?? "").replace(/\s+/g, " ").trim(),
    email: String(values?.email ?? "").trim(),
    phone: normalizePhone(values?.phone),
    question: String(values?.question ?? "").replace(/\r\n?/g, "\n").trim(),
  };
}

// Returns { field: message } for each invalid field; empty when everything is fine.
export function validateQuestion(values) {
  const errors = {};

  if (!values.name) errors.name = "Please enter your name.";
  else if (values.name.length > QUESTION_LIMITS.name) errors.name = `Your name can be at most ${QUESTION_LIMITS.name} characters.`;

  if (!values.email) errors.email = "Please enter your email address.";
  else if (!isValidEmail(values.email)) errors.email = "Please enter a valid email address.";

  if (!values.phone) errors.phone = "Please enter your phone number.";
  else if (!isValidUsPhone(values.phone)) errors.phone = "Please enter a valid US phone number, for example (212) 555-0123.";

  if (!values.question) errors.question = "Please enter your question.";
  else if (values.question.length > QUESTION_LIMITS.question) {
    errors.question = `Your question can be at most ${QUESTION_LIMITS.question} characters.`;
  }

  return errors;
}
