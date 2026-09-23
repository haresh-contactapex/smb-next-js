import { isValidUsPhone } from "@/lib/phone";
import { getPasswordErrorMessage, isValidPassword } from "@/components/auth/helpers";

export const EMPTY_PROFILE = {
  avatarUrl: null,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  bio: "",
  language: "en",
  timezone: "UTC+00:00",
  twoFactorEnabled: false,
  createdAt: null,
  lastLoginAt: null,
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function toFormState(profile) {
  return {
    ...EMPTY_PROFILE,
    ...profile,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
}

// Order the "focus the first bad field" behavior follows.
export const PROFILE_FIELD_ORDER = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "currentPassword",
  "newPassword",
  "confirmPassword",
];

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
export function validateProfileForm(profile) {
  const errors = {};

  if (!profile.firstName.trim()) errors.firstName = "Enter your first name.";
  if (!profile.lastName.trim()) errors.lastName = "Enter your last name.";
  if (!isValidEmail(profile.email)) errors.email = "Enter a valid email address.";
  if (!isValidUsPhone(profile.phone)) errors.phone = "Enter a valid 10-digit US phone number.";

  const changingPassword = Boolean(profile.currentPassword || profile.newPassword || profile.confirmPassword);
  if (changingPassword) {
    if (!profile.currentPassword) errors.currentPassword = "Enter your current password.";
    if (!isValidPassword(profile.newPassword)) {
      errors.newPassword = getPasswordErrorMessage(profile.newPassword) || "Enter a new password.";
    }
    if (profile.newPassword !== profile.confirmPassword) {
      errors.newPassword = errors.newPassword || "New password and confirmation must match.";
      errors.confirmPassword = "New password and confirmation must match.";
    }
  }

  const firstErrorField = PROFILE_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
