export const DEFAULT_LOGIN = {
  email: "",
  password: "",
  rememberMe: false,
};

export const DEFAULT_REGISTER = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  agreeTerms: false,
};

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPassword(value) {
  return value.length >= 8;
}
