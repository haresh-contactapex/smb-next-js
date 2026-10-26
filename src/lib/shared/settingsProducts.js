// Matches the product catalog's own status values (see
// src/components/add-product/StatusSidebar.js) so the default chosen here
// is exactly what a new product's Status field shows — Archived is omitted
// since it isn't a sensible starting status for a new product.
export const PRODUCT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
];

export const WEIGHT_UNITS = [
  { value: "lb", label: "lb" },
  { value: "kg", label: "kg" },
  { value: "g", label: "g" },
  { value: "oz", label: "oz" },
];

export const DEFAULT_PRODUCTS_SETTINGS = {
  skuPrefix: "",
  defaultStatus: "draft",
  defaultWeightUnit: "lb",
  allowBackorders: false,
  allowReviews: true,
  showLowStockBadge: true,
  lowStockThreshold: "5",
};

// Letters, numbers and dashes only, matching the sku_prefix VARCHAR(20) column.
export function isValidSkuPrefix(value) {
  return /^[A-Za-z0-9-]{1,20}$/.test(value.trim());
}

export function isValidLowStockThreshold(value) {
  if (!/^\d+$/.test(value.trim())) return false;
  return Number(value) >= 0;
}

export function toFormSettings(data) {
  if (!data) return DEFAULT_PRODUCTS_SETTINGS;
  return {
    skuPrefix: data.skuPrefix || "",
    defaultStatus: data.defaultStatus || "draft",
    defaultWeightUnit: data.defaultWeightUnit || "lb",
    allowBackorders: Boolean(data.allowBackorders),
    allowReviews: Boolean(data.allowReviews),
    showLowStockBadge: Boolean(data.showLowStockBadge),
    lowStockThreshold: data.lowStockThreshold != null ? String(data.lowStockThreshold) : "5",
  };
}

export function toSavePayload(settings) {
  return {
    skuPrefix: settings.skuPrefix,
    defaultStatus: settings.defaultStatus,
    defaultWeightUnit: settings.defaultWeightUnit,
    allowBackorders: settings.allowBackorders,
    allowReviews: settings.allowReviews,
    showLowStockBadge: settings.showLowStockBadge,
    lowStockThreshold: settings.lowStockThreshold,
  };
}

// Order the "focus the first bad field" behavior follows — top to bottom as
// the fields appear in the form.
export const PRODUCTS_FIELD_ORDER = ["skuPrefix", "lowStockThreshold"];

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
// `errors[field]` doubles as the red-border/highlight flag for that field.
// Default status and weight unit are selects with a fixed set of options,
// so they can never hold an invalid value.
export function validateProductsSettingsForm(settings) {
  const errors = {};

  if (!settings.skuPrefix.trim()) {
    errors.skuPrefix = "Enter a SKU prefix.";
  } else if (!isValidSkuPrefix(settings.skuPrefix)) {
    errors.skuPrefix = "Use up to 20 letters, numbers and dashes only.";
  }
  if (!settings.lowStockThreshold.trim()) {
    errors.lowStockThreshold = "Enter a low stock threshold.";
  } else if (!isValidLowStockThreshold(settings.lowStockThreshold)) {
    errors.lowStockThreshold = "Enter a whole number of 0 or more.";
  }

  const firstErrorField = PRODUCTS_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
