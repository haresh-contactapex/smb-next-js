export const CURRENCY_POSITIONS = [
  { value: "before", label: "Before amount ($100.00)" },
  { value: "after", label: "After amount (100.00$)" },
];

export const NUMBER_FORMATS = [
  { value: "1,234.56", label: "1,234.56" },
  { value: "1.234,56", label: "1.234,56" },
  { value: "1 234.56", label: "1 234.56" },
];

export const DEFAULT_CURRENCY_TAX_SETTINGS = {
  currency: "USD",
  currencyPosition: "before",
  numberFormat: "1,234.56",
  pricesIncludeTax: false,
  defaultTaxRate: "8.25",
  taxRegistrationNumber: "",
  applyTaxToShipping: true,
  enableTaxExemptGroups: false,
};

export function isValidTaxRate(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return false;
  const rate = Number(value);
  return rate >= 0 && rate <= 100;
}

// Accepts VAT / GST / EIN style registration numbers: letters, digits,
// spaces and dashes only.
export function isValidTaxRegistrationNumber(value) {
  return /^[A-Za-z0-9 -]+$/.test(value.trim());
}

export function toFormSettings(data) {
  if (!data) return DEFAULT_CURRENCY_TAX_SETTINGS;
  return {
    currency: data.currency || "USD",
    currencyPosition: data.currencyPosition || "before",
    numberFormat: data.numberFormat || "1,234.56",
    pricesIncludeTax: Boolean(data.pricesIncludeTax),
    defaultTaxRate: data.defaultTaxRate || "0",
    taxRegistrationNumber: data.taxRegistrationNumber || "",
    applyTaxToShipping: Boolean(data.applyTaxToShipping),
    enableTaxExemptGroups: Boolean(data.enableTaxExemptGroups),
  };
}

export function toSavePayload(settings) {
  return {
    currency: settings.currency,
    currencyPosition: settings.currencyPosition,
    numberFormat: settings.numberFormat,
    pricesIncludeTax: settings.pricesIncludeTax,
    defaultTaxRate: settings.defaultTaxRate,
    taxRegistrationNumber: settings.taxRegistrationNumber,
    applyTaxToShipping: settings.applyTaxToShipping,
    enableTaxExemptGroups: settings.enableTaxExemptGroups,
  };
}

// Order the "focus the first bad field" behavior follows — top to bottom as
// the fields appear in the form.
export const CURRENCY_TAX_FIELD_ORDER = ["defaultTaxRate", "taxRegistrationNumber"];

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
// `errors[field]` doubles as the red-border/highlight flag for that field.
// Currency, currency position and number format are selects with a fixed
// set of options, so they can never hold an invalid value.
export function validateCurrencyTaxSettingsForm(settings) {
  const errors = {};

  if (!settings.defaultTaxRate.trim()) {
    errors.defaultTaxRate = "Enter a default tax rate.";
  } else if (!isValidTaxRate(settings.defaultTaxRate)) {
    errors.defaultTaxRate = "Enter a tax rate between 0 and 100.";
  }
  if (settings.taxRegistrationNumber.trim() && !isValidTaxRegistrationNumber(settings.taxRegistrationNumber)) {
    errors.taxRegistrationNumber = "Use only letters, numbers, spaces and dashes.";
  }

  const firstErrorField = CURRENCY_TAX_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
