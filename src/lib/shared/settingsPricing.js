import { parseUuidList } from "./ids";

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

// The metal groups "Price Adjustment by Metal" prices separately. Every karat and
// gold colour counts toward its group, so "14K" covers 14K Rose, White and Yellow
// Gold (and short codes such as 14KR / 14KW / 14KY).
export const PRICING_METALS = [
  { value: "14k", label: "14K", description: "Rose, white and yellow gold", swatches: ["#E5B5A3", "#E0E0E0", "#E8C581"] },
  { value: "18k", label: "18K", description: "Rose, white and yellow gold", swatches: ["#E5B5A3", "#E0E0E0", "#E8C581"] },
  { value: "platinum", label: "Platinum", description: "Platinum and PT", swatches: ["#D4D4D4"] },
];

// A product's metal is its colour/metal option, found by option name (same rule as the
// storefront filter in src/lib/productsStorefront.js).
export const METAL_OPTION_PATTERN = /colou?r|metal/i;

// Which metal group an option value such as "14K Rose Gold", "18KW" or "PT" belongs to;
// null for anything else (titanium, cobalt, ...), which metal rules leave alone.
export function metalGroupOf(value) {
  const text = String(value ?? "").trim();
  if (/^14\s*k/i.test(text)) return "14k";
  if (/^18\s*k/i.test(text)) return "18k";
  if (/^platinum\b|^pt\d*$/i.test(text)) return "platinum";
  return null;
}

export const MAX_METAL_RULES = PRICING_METALS.length;

// Parses a posted `metalRules` list into [{ metal, adjustmentValue, adjustmentType,
// adjustmentDirection }]. Returns { rules } or { error }.
export function parseMetalRules(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return { error: "Select at least one metal to adjust." };
  if (raw.length > MAX_METAL_RULES) return { error: "Too many metal rules." };

  const seen = new Set();
  const rules = [];
  for (const item of raw) {
    const metal = String(item?.metal ?? "").trim();
    const metalInfo = PRICING_METALS.find((candidate) => candidate.value === metal);
    if (!metalInfo) return { error: "Select a valid metal." };
    if (seen.has(metal)) return { error: `${metalInfo.label} appears more than once.` };
    seen.add(metal);

    const adjustmentValue = String(item?.adjustmentValue ?? "").trim();
    const adjustmentType = String(item?.adjustmentType ?? "").trim();
    const adjustmentDirection = String(item?.adjustmentDirection ?? "").trim();
    if (!isValidAdjustmentValue(adjustmentValue)) {
      return { error: `Enter a number of 0 or more for ${metalInfo.label}, with up to 2 decimal places.` };
    }
    if (!ADJUSTMENT_TYPES.some((t) => t.value === adjustmentType)) {
      return { error: `Select a valid adjustment type for ${metalInfo.label}.` };
    }
    if (!ADJUSTMENT_DIRECTIONS.some((d) => d.value === adjustmentDirection)) {
      return { error: `Select a valid adjustment direction for ${metalInfo.label}.` };
    }
    rules.push({ metal, adjustmentValue, adjustmentType, adjustmentDirection });
  }
  return { rules };
}

export const DEFAULT_METAL_RULES = PRICING_METALS.map((metal) => ({
  metal: metal.value,
  enabled: true,
  adjustmentValue: "0",
  adjustmentType: "percentage",
  adjustmentDirection: "increase",
}));

// Validates the metal card's form rows: only ticked rows count, at least one must be ticked,
// and each ticked row needs a valid value. Returns { valid, errors: { [metal]: message }, message }.
export function validateMetalRulesForm(rows) {
  const errors = {};
  const active = rows.filter((row) => row.enabled);
  if (active.length === 0) {
    return { valid: false, errors, message: "Tick at least one metal to adjust." };
  }
  for (const row of active) {
    const value = String(row.adjustmentValue ?? "").trim();
    if (!value) errors[row.metal] = "Enter a value.";
    else if (!isValidAdjustmentValue(value)) errors[row.metal] = "Enter a number of 0 or more, up to 2 decimals.";
  }
  const first = active.find((row) => errors[row.metal]);
  return { valid: !first, errors, message: first ? errors[first.metal] : "" };
}

export function toMetalRulesPayload(rows) {
  return rows
    .filter((row) => row.enabled)
    .map(({ metal, adjustmentValue, adjustmentType, adjustmentDirection }) => ({
      metal,
      adjustmentValue: String(adjustmentValue).trim(),
      adjustmentType,
      adjustmentDirection,
    }));
}

// Result is always clamped at 0 and rounded to 2 decimal places, so it can be written
// straight to a DECIMAL(12,2) price column.
export function calculateAdjustedPrice(originalPrice, adjustmentValue, adjustmentType, adjustmentDirection) {
  const price = Number(originalPrice) || 0;
  const value = Number(adjustmentValue) || 0;
  const sign = adjustmentDirection === "decrease" ? -1 : 1;

  const adjusted = adjustmentType === "fixed" ? price + sign * value : price * (1 + (sign * value) / 100);

  return Math.max(0, Math.round(adjusted * 100) / 100);
}

const MAX_SCOPED_CATEGORIES = 200;

// Parses a posted { scope, categoryIds } into { categoryIds } (null = every product) or { error }.
export function parseApplyScope(payload) {
  const scope = String(payload?.scope || "all").trim();
  if (!PRICING_SCOPES.some((s) => s.value === scope)) return { error: "Select a valid price change scope." };
  if (scope !== "categories") return { categoryIds: null };

  const categoryIds = parseUuidList(payload.categoryIds, { max: MAX_SCOPED_CATEGORIES });
  if (!categoryIds) return { error: "Select at least one category to apply the price change to." };
  return { categoryIds };
}

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
