export const DEFAULT_CHECKOUT_SETTINGS = {
  allowGuestCheckout: true,
  requirePhone: false,
  requireTerms: true,
  minimumOrderAmount: "0",
  sendAbandonedCartEmails: true,
  reminderDelayHours: "4",
};

// Matches minimum_order_amount DECIMAL(12,2): a non-negative amount with at most two decimals.
export function isValidMinimumOrderAmount(value) {
  const text = String(value ?? "").trim();
  return /^\d{1,10}(\.\d{1,2})?$/.test(text);
}

// Matches reminder_delay_hours SMALLINT, at least 1.
export function isValidReminderDelayHours(value) {
  const text = String(value ?? "").trim();
  return /^\d{1,4}$/.test(text) && Number(text) >= 1;
}

export function toFormSettings(data) {
  if (!data) return DEFAULT_CHECKOUT_SETTINGS;
  return {
    allowGuestCheckout: Boolean(data.allowGuestCheckout),
    requirePhone: Boolean(data.requirePhone),
    requireTerms: Boolean(data.requireTerms),
    minimumOrderAmount: data.minimumOrderAmount != null ? String(data.minimumOrderAmount) : "0",
    sendAbandonedCartEmails: Boolean(data.sendAbandonedCartEmails),
    reminderDelayHours: data.reminderDelayHours != null ? String(data.reminderDelayHours) : "4",
  };
}

export function toSavePayload(settings) {
  return {
    allowGuestCheckout: settings.allowGuestCheckout,
    requirePhone: settings.requirePhone,
    requireTerms: settings.requireTerms,
    minimumOrderAmount: settings.minimumOrderAmount,
    sendAbandonedCartEmails: settings.sendAbandonedCartEmails,
    reminderDelayHours: settings.reminderDelayHours,
  };
}

// Top-to-bottom order the "focus the first bad field" behavior follows.
export const CHECKOUT_FIELD_ORDER = ["minimumOrderAmount", "reminderDelayHours"];

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
export function validateCheckoutSettingsForm(settings) {
  const errors = {};

  if (!String(settings.minimumOrderAmount).trim()) {
    errors.minimumOrderAmount = "Enter a minimum order amount (0 for none).";
  } else if (!isValidMinimumOrderAmount(settings.minimumOrderAmount)) {
    errors.minimumOrderAmount = "Enter an amount of 0 or more with up to two decimals.";
  }

  if (!String(settings.reminderDelayHours).trim()) {
    errors.reminderDelayHours = "Enter the reminder delay in hours.";
  } else if (!isValidReminderDelayHours(settings.reminderDelayHours)) {
    errors.reminderDelayHours = "Enter a whole number of hours, 1 or more.";
  }

  const firstErrorField = CHECKOUT_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
