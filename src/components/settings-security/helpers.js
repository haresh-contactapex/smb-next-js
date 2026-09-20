export const DEFAULT_SECURITY_SETTINGS = {
  requireTwoFactorAuth: false,
  sessionTimeoutMinutes: "30",
  passwordExpiryDays: "90",
  maxLoginAttempts: "5",
  ipAllowlist: "",
  enableRecaptcha: true,
};

export function isValidSessionTimeoutMinutes(value) {
  if (!/^\d+$/.test(value.trim())) return false;
  return Number(value) >= 1;
}

export function isValidPasswordExpiryDays(value) {
  if (!/^\d+$/.test(value.trim())) return false;
  return Number(value) >= 1;
}

export function isValidMaxLoginAttempts(value) {
  if (!/^\d+$/.test(value.trim())) return false;
  return Number(value) >= 1;
}

const IP_OR_CIDR_LINE =
  /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}(\/(3[0-2]|[12]?[0-9]))?$/;

// The allowlist is optional. When present, every non-blank line must look
// like an IPv4 address or CIDR range.
export function isValidIpAllowlist(value) {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.every((line) => IP_OR_CIDR_LINE.test(line));
}

export function toFormSettings(data) {
  if (!data) return DEFAULT_SECURITY_SETTINGS;
  return {
    requireTwoFactorAuth: Boolean(data.requireTwoFactorAuth),
    sessionTimeoutMinutes: data.sessionTimeoutMinutes != null ? String(data.sessionTimeoutMinutes) : "30",
    passwordExpiryDays: data.passwordExpiryDays != null ? String(data.passwordExpiryDays) : "90",
    maxLoginAttempts: data.maxLoginAttempts != null ? String(data.maxLoginAttempts) : "5",
    ipAllowlist: data.ipAllowlist || "",
    enableRecaptcha: Boolean(data.enableRecaptcha),
  };
}

export function toSavePayload(settings) {
  return {
    requireTwoFactorAuth: settings.requireTwoFactorAuth,
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
    passwordExpiryDays: settings.passwordExpiryDays,
    maxLoginAttempts: settings.maxLoginAttempts,
    ipAllowlist: settings.ipAllowlist,
    enableRecaptcha: settings.enableRecaptcha,
  };
}

// Order the "focus the first bad field" behavior follows — top to bottom as
// the fields appear in the form. Authentication fields are required; the
// IP allowlist is optional and only validated when non-empty.
export const SECURITY_FIELD_ORDER = ["sessionTimeoutMinutes", "passwordExpiryDays", "maxLoginAttempts", "ipAllowlist"];

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
// `errors[field]` doubles as the red-border/highlight flag for that field.
// The two toggles always hold a valid boolean, so they need no validation.
export function validateSecuritySettingsForm(settings) {
  const errors = {};

  if (!settings.sessionTimeoutMinutes.trim()) {
    errors.sessionTimeoutMinutes = "Enter a session timeout.";
  } else if (!isValidSessionTimeoutMinutes(settings.sessionTimeoutMinutes)) {
    errors.sessionTimeoutMinutes = "Enter a whole number of 1 or more.";
  }

  if (!settings.passwordExpiryDays.trim()) {
    errors.passwordExpiryDays = "Enter a password expiry.";
  } else if (!isValidPasswordExpiryDays(settings.passwordExpiryDays)) {
    errors.passwordExpiryDays = "Enter a whole number of 1 or more.";
  }

  if (!settings.maxLoginAttempts.trim()) {
    errors.maxLoginAttempts = "Enter the max login attempts.";
  } else if (!isValidMaxLoginAttempts(settings.maxLoginAttempts)) {
    errors.maxLoginAttempts = "Enter a whole number of 1 or more.";
  }

  if (settings.ipAllowlist.trim() && !isValidIpAllowlist(settings.ipAllowlist)) {
    errors.ipAllowlist = "Enter one valid IP address or CIDR range per line.";
  }

  const firstErrorField = SECURITY_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
