import { WEIGHT_UNITS } from "@/components/settings-products/helpers";

export const CARRIERS = ["USPS", "UPS", "FedEx", "DHL", "Local Courier"];
// Shared with Settings -> Products so the two "weight unit" dropdowns always
// offer the same choices — the Shipping value is kept in sync with the
// Products default weight unit (see updateProductsSettings).
export { WEIGHT_UNITS };
export const DIMENSION_UNITS = ["in", "cm"];

export const DEFAULT_SHIPPING_SETTINGS = {
  defaultCarrier: "USPS",
  flatRateFee: "5.99",
  freeShippingThreshold: "75",
  processingTimeDays: "2",
  weightUnit: "lb",
  dimensionUnit: "in",
  localPickupEnabled: false,
};

// Matches the DECIMAL(12,2) columns: a non-negative amount with up to 2 decimal places.
export function isValidMoneyAmount(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return false;
  return Number(value) >= 0;
}

// Matches the SMALLINT processing_time_days column: a non-negative whole number.
export function isValidProcessingTimeDays(value) {
  if (!/^\d+$/.test(value.trim())) return false;
  return Number(value) >= 0;
}

export function toFormSettings(data) {
  if (!data) return DEFAULT_SHIPPING_SETTINGS;
  return {
    defaultCarrier: data.defaultCarrier || "USPS",
    flatRateFee: data.flatRateFee != null ? String(data.flatRateFee) : "5.99",
    freeShippingThreshold: data.freeShippingThreshold != null ? String(data.freeShippingThreshold) : "75",
    processingTimeDays: data.processingTimeDays != null ? String(data.processingTimeDays) : "2",
    weightUnit: data.weightUnit || "lb",
    dimensionUnit: data.dimensionUnit || "in",
    localPickupEnabled: Boolean(data.localPickupEnabled),
  };
}

export function toSavePayload(settings) {
  return {
    defaultCarrier: settings.defaultCarrier,
    flatRateFee: settings.flatRateFee,
    freeShippingThreshold: settings.freeShippingThreshold,
    processingTimeDays: settings.processingTimeDays,
    weightUnit: settings.weightUnit,
    dimensionUnit: settings.dimensionUnit,
    localPickupEnabled: settings.localPickupEnabled,
  };
}

// Order the "focus the first bad field" behavior follows — top to bottom as
// the fields appear in the form.
export const SHIPPING_FIELD_ORDER = ["flatRateFee", "freeShippingThreshold", "processingTimeDays"];

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
// `errors[field]` doubles as the red-border/highlight flag for that field.
// Default carrier, weight unit and dimension unit are selects with a fixed
// set of options, so they can never hold an invalid value.
export function validateShippingSettingsForm(settings) {
  const errors = {};

  if (!settings.flatRateFee.trim()) {
    errors.flatRateFee = "Enter a flat rate shipping fee.";
  } else if (!isValidMoneyAmount(settings.flatRateFee)) {
    errors.flatRateFee = "Enter an amount of 0 or more, with up to 2 decimal places.";
  }

  if (!settings.freeShippingThreshold.trim()) {
    errors.freeShippingThreshold = "Enter a free shipping threshold.";
  } else if (!isValidMoneyAmount(settings.freeShippingThreshold)) {
    errors.freeShippingThreshold = "Enter an amount of 0 or more, with up to 2 decimal places.";
  }

  if (!settings.processingTimeDays.trim()) {
    errors.processingTimeDays = "Enter an order processing time.";
  } else if (!isValidProcessingTimeDays(settings.processingTimeDays)) {
    errors.processingTimeDays = "Enter a whole number of 0 or more.";
  }

  const firstErrorField = SHIPPING_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
