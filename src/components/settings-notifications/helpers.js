import { isValidEmail } from "@/components/auth/helpers";

export const MIN_TOAST_TIMEOUT_SECONDS = 1;
export const MAX_TOAST_TIMEOUT_SECONDS = 30;

export const DEFAULT_NOTIFICATIONS_SETTINGS = {
  newOrderEmailAlert: true,
  lowStockAlert: true,
  newCustomerSignupAlert: false,
  notificationRecipientEmail: "",
  enableSmsNotifications: false,
  enablePushNotifications: false,
  toastTimeoutSeconds: "3",
};

export function isValidToastTimeoutSeconds(value) {
  if (!/^\d+$/.test(String(value).trim())) return false;
  const number = Number(value);
  return number >= MIN_TOAST_TIMEOUT_SECONDS && number <= MAX_TOAST_TIMEOUT_SECONDS;
}

export function toFormSettings(data) {
  if (!data) return DEFAULT_NOTIFICATIONS_SETTINGS;
  return {
    newOrderEmailAlert: Boolean(data.newOrderEmailAlert),
    lowStockAlert: Boolean(data.lowStockAlert),
    newCustomerSignupAlert: Boolean(data.newCustomerSignupAlert),
    notificationRecipientEmail: data.notificationRecipientEmail || "",
    enableSmsNotifications: Boolean(data.enableSmsNotifications),
    enablePushNotifications: Boolean(data.enablePushNotifications),
    toastTimeoutSeconds: data.toastTimeoutSeconds != null ? String(data.toastTimeoutSeconds) : "3",
  };
}

export function toSavePayload(settings) {
  return {
    newOrderEmailAlert: settings.newOrderEmailAlert,
    lowStockAlert: settings.lowStockAlert,
    newCustomerSignupAlert: settings.newCustomerSignupAlert,
    notificationRecipientEmail: settings.notificationRecipientEmail,
    enableSmsNotifications: settings.enableSmsNotifications,
    enablePushNotifications: settings.enablePushNotifications,
    toastTimeoutSeconds: settings.toastTimeoutSeconds,
  };
}

// Order the "focus the first bad field" behavior follows — top to bottom as
// the fields appear in the form.
export const NOTIFICATIONS_FIELD_ORDER = ["notificationRecipientEmail", "toastTimeoutSeconds"];

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
// `errors[field]` doubles as the red-border/highlight flag for that field.
export function validateNotificationsSettingsForm(settings) {
  const errors = {};

  if (!settings.notificationRecipientEmail.trim()) {
    errors.notificationRecipientEmail = "Enter a notification recipient email.";
  } else if (!isValidEmail(settings.notificationRecipientEmail)) {
    errors.notificationRecipientEmail = "Enter a valid email address.";
  }

  if (!String(settings.toastTimeoutSeconds).trim()) {
    errors.toastTimeoutSeconds = "Enter a toast notification timeout.";
  } else if (!isValidToastTimeoutSeconds(settings.toastTimeoutSeconds)) {
    errors.toastTimeoutSeconds = `Enter a whole number between ${MIN_TOAST_TIMEOUT_SECONDS} and ${MAX_TOAST_TIMEOUT_SECONDS}.`;
  }

  const firstErrorField = NOTIFICATIONS_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
