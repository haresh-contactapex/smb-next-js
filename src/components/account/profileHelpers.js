// Pure validation for the Profile & security forms. The server repeats every
// check; these exist so most mistakes are caught before a request.
import { getPasswordChecks, getPasswordStrength, isValidEmail, isValidPassword } from "@/components/auth/helpers";
import { isValidUsPhone } from "@/lib/phone";

export function validateProfile(values) {
  const errors = {};
  if (!values.firstName.trim()) errors.firstName = "Enter your first name.";
  if (!values.lastName.trim()) errors.lastName = "Enter your last name.";
  if (!isValidUsPhone(values.phone)) errors.phone = "Enter a 10-digit phone number, or leave it blank.";
  return errors;
}

export function validateEmailChange(values, currentEmail) {
  const errors = {};
  const email = values.email.trim();
  if (!email) errors.email = "Enter your new email address.";
  else if (!isValidEmail(email)) errors.email = "Enter a valid email address, like name@example.com.";
  else if (email.toLowerCase() === String(currentEmail).toLowerCase()) errors.email = "That is already your email address.";
  if (!values.currentPassword) errors.currentPassword = "Enter your current password to confirm.";
  return errors;
}

export function validatePasswordChange(values) {
  const errors = {};
  if (!values.currentPassword) errors.currentPassword = "Enter your current password.";
  if (!values.newPassword) errors.newPassword = "Enter a new password.";
  else if (!isValidPassword(values.newPassword)) errors.newPassword = "Use at least 8 characters with a letter, a number and a special character.";
  else if (values.newPassword === values.currentPassword) errors.newPassword = "Choose a password you haven't used here before.";
  if (!values.confirmPassword) errors.confirmPassword = "Re-enter your new password.";
  else if (values.confirmPassword !== values.newPassword) errors.confirmPassword = "The passwords don't match.";
  return errors;
}

// The rules a new password must meet, with whether `value` meets each, for the checklist.
export function passwordRequirements(value) {
  const checks = getPasswordChecks(value);
  return [
    { id: "length", label: "At least 8 characters", met: checks.hasMinLength },
    { id: "letter", label: "A letter", met: checks.hasLetter },
    { id: "number", label: "A number", met: checks.hasNumber },
    { id: "special", label: "A special character", met: checks.hasSpecialChar },
  ];
}

const STRENGTH_COLORS = { Low: "bg-red-500", Medium: "bg-amber-500", Strong: "bg-green-600" };
const STRENGTH_TEXT = { Low: "text-red-600", Medium: "text-amber-600", Strong: "text-green-700" };

// null for an empty password, else { label, percent, barClass, textClass } in the storefront's light palette.
export function passwordStrength(value) {
  const strength = getPasswordStrength(value);
  if (!strength) return null;
  return { label: strength.label, percent: strength.percent, barClass: STRENGTH_COLORS[strength.label], textClass: STRENGTH_TEXT[strength.label] };
}

// The word a customer types to confirm deleting their account.
export const DELETE_CONFIRM_WORD = "DELETE";
