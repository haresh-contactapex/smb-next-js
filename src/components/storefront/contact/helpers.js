// Pure helpers for the storefront Contact form. Shared by the form (live field
// feedback) and /api/contact (the real check), so both sides agree on what is
// valid. Nothing here touches the server or DOM. The email and phone rules and
// the shared limits are the "Ask a question" form's; only the message differs.

import { QUESTION_LIMITS, isValidEmail, isValidPhone } from "../ask-question/helpers";

export const CONTACT_LIMITS = {
  name: QUESTION_LIMITS.name,
  email: QUESTION_LIMITS.email,
  phone: QUESTION_LIMITS.phone,
  message: 2000,
};

export const EMPTY_CONTACT = { name: "", email: "", phone: "", message: "" };

// Order the fields appear in, so the first invalid one gets focus.
export const CONTACT_FIELDS = ["name", "email", "phone", "message"];

// Trims everything and flattens the name to one line (it ends up in an email
// subject and header). Works on anything a request body might contain.
export function normalizeContact(values) {
  return {
    name: String(values?.name ?? "").replace(/\s+/g, " ").trim(),
    email: String(values?.email ?? "").trim(),
    phone: String(values?.phone ?? "").trim(),
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
  else if (!isValidPhone(values.phone)) errors.phone = "Please enter a valid phone number.";

  if (!values.message) errors.message = "Please enter your message.";
  else if (values.message.length > CONTACT_LIMITS.message) {
    errors.message = `Your message can be at most ${CONTACT_LIMITS.message} characters.`;
  }

  return errors;
}
