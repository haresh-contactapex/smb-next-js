export const DEFAULT_PROFILE = {
  avatar: null,
  firstName: "Haresh",
  lastName: "Ambaliya",
  email: "admin@shopmyband.com",
  phone: "",
  bio: "",
  language: "en",
  timezone: "UTC+05:30",
  twoFactorEnabled: false,
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
