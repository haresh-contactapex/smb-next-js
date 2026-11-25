export const ADJUSTMENT_TYPES = [
  { value: "percentage", label: "Percentage" },
  { value: "fixed", label: "Fixed" },
];

export const ADJUSTMENT_DIRECTIONS = [
  { value: "increase", label: "Increase" },
  { value: "decrease", label: "Decrease" },
];

// Who "Apply to All Products" actually rewrites: every product, or only
// products in the chosen categories (a product counts if its primary
// category or any other one it's listed under is selected — see
// applyPriceAdjustmentToAllProducts in src/lib/pricing.js).
export const PRICING_SCOPES = [
  { value: "all", label: "All Products" },
  { value: "categories", label: "Specific Categories" },
];

export const DEFAULT_PRICING_SETTINGS = {
  adjustmentValue: "0",
  adjustmentType: "percentage",
  adjustmentDirection: "increase",
};

export function isValidAdjustmentValue(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return false;
  return Number(value) >= 0;
}

export function toFormSettings(data) {
  if (!data) return DEFAULT_PRICING_SETTINGS;
  return {
    adjustmentValue: data.adjustmentValue != null ? String(data.adjustmentValue) : "0",
    adjustmentType: data.adjustmentType || "percentage",
    adjustmentDirection: data.adjustmentDirection || "increase",
  };
}

export function toSavePayload(settings) {
  return {
    adjustmentValue: settings.adjustmentValue,
    adjustmentType: settings.adjustmentType,
    adjustmentDirection: settings.adjustmentDirection,
  };
}

// Order the "focus the first bad field" behavior follows — top to bottom as
// the fields appear in the form.
export const PRICING_FIELD_ORDER = ["adjustmentValue"];

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
// `errors[field]` doubles as the red-border/highlight flag for that field.
// Adjustment type and direction are selects with a fixed set of options,
// so they can never hold an invalid value.
export function validatePricingSettingsForm(settings) {
  const errors = {};

  if (!settings.adjustmentValue.trim()) {
    errors.adjustmentValue = "Enter an adjustment value.";
  } else if (!isValidAdjustmentValue(settings.adjustmentValue)) {
    errors.adjustmentValue = "Enter a number of 0 or more, with up to 2 decimal places.";
  }

  const firstErrorField = PRICING_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}

// The scope selector isn't part of the saved settings (toSavePayload above),
// just an apply-time choice, so it's validated separately.
export function validateApplyScope(scope, categoryIds) {
  if (scope === "categories" && (!Array.isArray(categoryIds) || categoryIds.length === 0)) {
    return { valid: false, message: "Select at least one category to apply the price change to." };
  }
  return { valid: true, message: "" };
}
