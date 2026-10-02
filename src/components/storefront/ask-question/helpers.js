// Pure helpers for the product page's "Ask a question" form. Shared by the
// form (live field feedback) and /api/product-questions (the real check), so
// both sides agree on what is valid. Nothing here touches the server or DOM.

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

// Digits plus the usual separators; 7-15 digits covers local through E.164 numbers.
export function isValidPhone(value) {
  if (value.length > QUESTION_LIMITS.phone || !/^[\d\s().+-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

// Trims everything and flattens the name to one line (it ends up in an email
// subject and header). Works on anything a request body might contain.
export function normalizeQuestion(values) {
  return {
    name: String(values?.name ?? "").replace(/\s+/g, " ").trim(),
    email: String(values?.email ?? "").trim(),
    phone: String(values?.phone ?? "").trim(),
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
  else if (!isValidPhone(values.phone)) errors.phone = "Please enter a valid phone number.";

  if (!values.question) errors.question = "Please enter your question.";
  else if (values.question.length > QUESTION_LIMITS.question) {
    errors.question = `Your question can be at most ${QUESTION_LIMITS.question} characters.`;
  }

  return errors;
}
