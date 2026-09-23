import { formatUsPhone, isValidUsPhone } from "@/lib/phone";
import { getPasswordErrorMessage, isValidPassword } from "@/components/auth/helpers";

// Keep in sync with the limits in src/lib/staffUsers.js.
export const NAME_MAX = 100;
export const EMAIL_MAX = 255;
export const BIO_MAX = 500;
export const PASSWORD_MAX = 72;

export const EMPTY_USER_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  bio: "",
  role: "",
  language: "en",
  timezone: "UTC+00:00",
  twoFactorEnabled: false,
  password: "",
  confirmPassword: "",
  unlock: false,
};

// Order the "focus the first bad field" behavior follows.
export const USER_FIELD_ORDER = ["firstName", "lastName", "email", "phone", "role", "bio", "password", "confirmPassword"];

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function fullName(user) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function initialsFor(user) {
  return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "?";
}

export function isLocked(user) {
  return Boolean(user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now());
}

// UTC keeps the server-rendered and hydrated text identical.
export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// Stored numbers may carry a +1 country code (e.g. "+1 415 555 0107"); the
// form uses the app's 10-digit US format, so drop it before formatting.
function toFormPhone(value) {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  return formatUsPhone(digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits);
}

export function toFormUser(user, defaultRole = "") {
  if (!user) return { ...EMPTY_USER_FORM, role: defaultRole };
  return {
    ...EMPTY_USER_FORM,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: toFormPhone(user.phone),
    bio: user.bio || "",
    role: user.role,
    language: user.language,
    timezone: user.timezone,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
  };
}

export function toSavePayload(form) {
  const payload = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    bio: form.bio.trim(),
    role: form.role,
    language: form.language,
    timezone: form.timezone,
    twoFactorEnabled: form.twoFactorEnabled,
    unlock: form.unlock,
  };
  if (form.password) payload.password = form.password;
  return payload;
}

// Returns { valid, errors, firstErrorField, message }. `isEdit` makes the
// password optional (blank keeps the current one).
export function validateUserForm(form, { isEdit }) {
  const errors = {};
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const email = form.email.trim();

  if (!firstName) errors.firstName = "First name is required.";
  else if (firstName.length > NAME_MAX) errors.firstName = `First name must be ${NAME_MAX} characters or fewer.`;
  if (!lastName) errors.lastName = "Last name is required.";
  else if (lastName.length > NAME_MAX) errors.lastName = `Last name must be ${NAME_MAX} characters or fewer.`;
  if (!email || !isValidEmail(email)) errors.email = "Enter a valid email address.";
  else if (email.length > EMAIL_MAX) errors.email = `Email must be ${EMAIL_MAX} characters or fewer.`;
  if (!isValidUsPhone(form.phone)) errors.phone = "Enter a valid 10-digit US phone number.";
  if (!form.role) errors.role = "Choose a role.";
  if (form.bio.trim().length > BIO_MAX) errors.bio = `Bio must be ${BIO_MAX} characters or fewer.`;

  if (!isEdit || form.password || form.confirmPassword) {
    // Same rule as My Account -> Profile: 8+ characters with a letter, a
    // number and a special character.
    if (!form.password) errors.password = "Password is required.";
    else if (!isValidPassword(form.password)) errors.password = getPasswordErrorMessage(form.password);
    else if (new TextEncoder().encode(form.password).length > PASSWORD_MAX) {
      errors.password = `Password must be ${PASSWORD_MAX} characters or fewer.`;
    }
    if (form.password !== form.confirmPassword) errors.confirmPassword = "Passwords don't match.";
  }

  const firstErrorField = USER_FIELD_ORDER.find((field) => errors[field]);
  return { valid: !firstErrorField, errors, firstErrorField, message: firstErrorField ? errors[firstErrorField] : "" };
}
