export const ORDER_STATUSES = [
  { value: "Pending", label: "Pending" },
  { value: "Processing", label: "Processing" },
  { value: "Completed", label: "Completed" },
];

export const MIN_AUTO_CANCEL_HOURS = 24;

export const DEFAULT_ORDERS_SETTINGS = {
  orderNumberPrefix: "SMB-",
  startingOrderNumber: "10000",
  autoCancelHours: "24",
  defaultOrderStatus: "Pending",
  requireConfirmationEmail: true,
  allowOrderEdits: false,
};

// Letters, numbers and dashes only, matching the order_number_prefix VARCHAR(20) column.
export function isValidOrderNumberPrefix(value) {
  return /^[A-Za-z0-9-]{1,20}$/.test(value.trim());
}

export function isValidStartingOrderNumber(value) {
  if (!/^\d+$/.test(value.trim())) return false;
  return Number(value) >= 0;
}

export function isValidAutoCancelHours(value) {
  if (!/^\d+$/.test(value.trim())) return false;
  return Number(value) >= MIN_AUTO_CANCEL_HOURS;
}

export function toFormSettings(data) {
  if (!data) return DEFAULT_ORDERS_SETTINGS;
  return {
    orderNumberPrefix: data.orderNumberPrefix || "",
    startingOrderNumber: data.startingOrderNumber != null ? String(data.startingOrderNumber) : "10000",
    autoCancelHours: data.autoCancelHours != null ? String(data.autoCancelHours) : "24",
    defaultOrderStatus: data.defaultOrderStatus || "Pending",
    requireConfirmationEmail: Boolean(data.requireConfirmationEmail),
    allowOrderEdits: Boolean(data.allowOrderEdits),
  };
}

export function toSavePayload(settings) {
  return {
    orderNumberPrefix: settings.orderNumberPrefix,
    startingOrderNumber: settings.startingOrderNumber,
    autoCancelHours: settings.autoCancelHours,
    defaultOrderStatus: settings.defaultOrderStatus,
    requireConfirmationEmail: settings.requireConfirmationEmail,
    allowOrderEdits: settings.allowOrderEdits,
  };
}

// Order the "focus the first bad field" behavior follows — top to bottom as
// the fields appear in the form.
export const ORDERS_FIELD_ORDER = ["orderNumberPrefix", "startingOrderNumber", "autoCancelHours"];

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
// `errors[field]` doubles as the red-border/highlight flag for that field.
// Default order status is a select with a fixed set of options, so it can
// never hold an invalid value.
export function validateOrdersSettingsForm(settings) {
  const errors = {};

  if (!settings.orderNumberPrefix.trim()) {
    errors.orderNumberPrefix = "Enter an order number prefix.";
  } else if (!isValidOrderNumberPrefix(settings.orderNumberPrefix)) {
    errors.orderNumberPrefix = "Use up to 20 letters, numbers and dashes only.";
  }

  if (!settings.startingOrderNumber.trim()) {
    errors.startingOrderNumber = "Enter a starting order number.";
  } else if (!isValidStartingOrderNumber(settings.startingOrderNumber)) {
    errors.startingOrderNumber = "Enter a whole number of 0 or more.";
  }

  if (!settings.autoCancelHours.trim()) {
    errors.autoCancelHours = "Enter the auto-cancel window.";
  } else if (!isValidAutoCancelHours(settings.autoCancelHours)) {
    errors.autoCancelHours = `Enter a whole number of ${MIN_AUTO_CANCEL_HOURS} or more.`;
  }

  const firstErrorField = ORDERS_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
