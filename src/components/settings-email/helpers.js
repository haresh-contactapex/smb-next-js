import { isValidEmail } from "@/components/auth/helpers";

// Column widths from docs/settings/email-table-only.sql.
export const MAX_SMTP_HOST_LENGTH = 255;
export const MAX_SMTP_USERNAME_LENGTH = 255;
export const MAX_SMTP_PASSWORD_LENGTH = 255;
export const MAX_SENDER_NAME_LENGTH = 150;
export const MAX_SENDER_EMAIL_LENGTH = 255;
export const MAX_EMAIL_FOOTER_LENGTH = 1000;

export const DEFAULT_EMAIL_SETTINGS = {
  smtpHost: "",
  smtpPort: "587",
  smtpUsername: "",
  smtpPassword: "",
  hasSmtpPassword: false,
  senderName: "",
  senderEmail: "",
  sendOrderConfirmationEmails: true,
  sendShippingNotificationEmails: true,
  sendMarketingEmails: false,
  emailFooterText: "",
  activeSmtpSource: "none",
};

// Where outgoing email currently gets its SMTP connection (see src/lib/email.js).
export const SMTP_SOURCE_NOTICES = {
  settings: {
    tone: "success",
    icon: "check-circle",
    message: "All store emails are sent with the SMTP details saved on this page.",
  },
  env: {
    tone: "warning",
    icon: "alert-triangle",
    message:
      "Store emails are currently sent with the SMTP_* details from .env.local. Save SMTP details here to take over for the whole system.",
  },
  none: {
    tone: "error",
    icon: "x-circle",
    message: "No SMTP details are configured, so store emails (password resets, welcome emails) are not being sent.",
  },
};

// A hostname (smtp.sendgrid.net, localhost) or an IPv4 address.
export function isValidSmtpHost(value) {
  const host = value.trim();
  if (!host || host.length > MAX_SMTP_HOST_LENGTH) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return host.split(".").every((part) => Number(part) <= 255);
  }
  return /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(host);
}

// Matches the smtp_port CHECK constraint: a whole number from 1 to 65535.
export function isValidSmtpPort(value) {
  if (!/^\d+$/.test(String(value).trim())) return false;
  const port = Number(value);
  return port >= 1 && port <= 65535;
}

export function toFormSettings(data) {
  if (!data) return DEFAULT_EMAIL_SETTINGS;
  return {
    smtpHost: data.smtpHost || "",
    smtpPort: data.smtpPort != null ? String(data.smtpPort) : "587",
    smtpUsername: data.smtpUsername || "",
    // The API never returns the stored password; the field stays blank and
    // a blank value on save keeps the current one.
    smtpPassword: "",
    hasSmtpPassword: Boolean(data.hasSmtpPassword),
    senderName: data.senderName || "",
    senderEmail: data.senderEmail || "",
    sendOrderConfirmationEmails: Boolean(data.sendOrderConfirmationEmails),
    sendShippingNotificationEmails: Boolean(data.sendShippingNotificationEmails),
    sendMarketingEmails: Boolean(data.sendMarketingEmails),
    emailFooterText: data.emailFooterText || "",
    activeSmtpSource: SMTP_SOURCE_NOTICES[data.activeSmtpSource] ? data.activeSmtpSource : "none",
  };
}

export function toSavePayload(settings) {
  return {
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUsername: settings.smtpUsername,
    smtpPassword: settings.smtpPassword,
    senderName: settings.senderName,
    senderEmail: settings.senderEmail,
    sendOrderConfirmationEmails: settings.sendOrderConfirmationEmails,
    sendShippingNotificationEmails: settings.sendShippingNotificationEmails,
    sendMarketingEmails: settings.sendMarketingEmails,
    emailFooterText: settings.emailFooterText,
  };
}

// Order the "focus the first bad field" behavior follows — top to bottom as
// the fields appear in the form.
export const EMAIL_FIELD_ORDER = [
  "smtpHost",
  "smtpPort",
  "smtpUsername",
  "smtpPassword",
  "senderName",
  "senderEmail",
  "emailFooterText",
];

// Returns { [field]: message } for every invalid field. Shared by the form
// and the PUT route so both enforce the same rules. `hasSmtpPassword` says
// whether a password is already stored — only then may the field be blank.
export function getEmailSettingsErrors(settings, { hasSmtpPassword = false } = {}) {
  const errors = {};

  if (!settings.smtpHost.trim()) {
    errors.smtpHost = "Enter an SMTP host.";
  } else if (!isValidSmtpHost(settings.smtpHost)) {
    errors.smtpHost = "Enter a valid host name or IP address, e.g. smtp.sendgrid.net.";
  }

  if (!String(settings.smtpPort).trim()) {
    errors.smtpPort = "Enter an SMTP port.";
  } else if (!isValidSmtpPort(settings.smtpPort)) {
    errors.smtpPort = "Enter a whole number between 1 and 65535.";
  }

  if (!settings.smtpUsername.trim()) {
    errors.smtpUsername = "Enter an SMTP username.";
  } else if (settings.smtpUsername.trim().length > MAX_SMTP_USERNAME_LENGTH) {
    errors.smtpUsername = `SMTP username must be ${MAX_SMTP_USERNAME_LENGTH} characters or fewer.`;
  }

  if (!settings.smtpPassword) {
    if (!hasSmtpPassword) errors.smtpPassword = "Enter an SMTP password.";
  } else if (settings.smtpPassword.length > MAX_SMTP_PASSWORD_LENGTH) {
    errors.smtpPassword = `SMTP password must be ${MAX_SMTP_PASSWORD_LENGTH} characters or fewer.`;
  }

  if (!settings.senderName.trim()) {
    errors.senderName = "Enter a sender name.";
  } else if (settings.senderName.trim().length > MAX_SENDER_NAME_LENGTH) {
    errors.senderName = `Sender name must be ${MAX_SENDER_NAME_LENGTH} characters or fewer.`;
  }

  if (!settings.senderEmail.trim()) {
    errors.senderEmail = "Enter a sender email.";
  } else if (
    settings.senderEmail.trim().length > MAX_SENDER_EMAIL_LENGTH ||
    !isValidEmail(settings.senderEmail.trim())
  ) {
    errors.senderEmail = "Enter a valid email address.";
  }

  if (settings.emailFooterText.trim().length > MAX_EMAIL_FOOTER_LENGTH) {
    errors.emailFooterText = `Email footer text must be ${MAX_EMAIL_FOOTER_LENGTH} characters or fewer.`;
  }

  return errors;
}

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
// `errors[field]` doubles as the red-border/highlight flag for that field.
export function validateEmailSettingsForm(settings) {
  const errors = getEmailSettingsErrors(settings, { hasSmtpPassword: settings.hasSmtpPassword });
  const firstErrorField = EMAIL_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
