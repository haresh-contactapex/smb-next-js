// Integrity rules for a product payload, enforced by the server on every save (form, API and
// CSV import alike). They cover what the database would otherwise reject with a raw driver
// error or silently accept (a free ACTIVE product, an Infinity price). The Add Product form
// keeps its own completeness checks (description, category, media, SKU) on top of these.
// Pure: no React, DOM or database access.

export const PRODUCT_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"];
export const WEIGHT_UNITS = ["kg", "g", "lb", "oz"];

export const MAX_TITLE_LENGTH = 255;
export const MAX_HANDLE_LENGTH = 255;
export const MAX_PRODUCT_TYPE_LENGTH = 100;
export const MAX_SKU_LENGTH = 100;
export const MAX_SEO_TITLE_LENGTH = 70;
export const MAX_SEO_DESCRIPTION_LENGTH = 160;
export const MAX_VARIANTS = 1000;

// DECIMAL(12, 2) money columns and DECIMAL(10, 3) weights hold fewer than these.
const MAX_AMOUNT = 1e10;
const MAX_WEIGHT = 1e7;
const MAX_QUANTITY = 2147483647;

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

// Reads a form string ("12.50"), a CSV number or a JSON number. `{ blank: true }` for an empty
// field, `{ value }` for a finite number, `{ invalid: true }` for anything else (NaN, Infinity,
// "12abc", booleans, objects).
function readNumber(raw) {
  if (isBlank(raw)) return { blank: true };
  if (typeof raw !== "number" && typeof raw !== "string") return { invalid: true };
  const value = Number(String(raw).trim());
  return Number.isFinite(value) ? { value } : { invalid: true };
}

function checkAmount(raw, { max, label, errors, field, positive = false, required = false }) {
  const parsed = readNumber(raw);
  if (parsed.blank) {
    if (required) errors.push({ field, message: `${label} is required.` });
    return null;
  }
  if (parsed.invalid || parsed.value < 0 || parsed.value >= max) {
    errors.push({ field, message: `${label} must be a number of zero or more.` });
    return null;
  }
  if (positive && parsed.value === 0) {
    errors.push({ field, message: `${label} must be greater than zero.` });
    return null;
  }
  return parsed.value;
}

function checkText(raw, { max, label, errors, field }) {
  if (isBlank(raw)) return;
  if (typeof raw !== "string") {
    errors.push({ field, message: `${label} must be text.` });
  } else if (raw.trim().length > max) {
    errors.push({ field, message: `${label} must be ${max} characters or fewer.` });
  }
}

function checkWeightUnit(raw, { label, errors, field }) {
  if (isBlank(raw)) return;
  if (!WEIGHT_UNITS.includes(raw)) {
    errors.push({ field, message: `${label} must be one of ${WEIGHT_UNITS.join(", ")}.` });
  }
}

function checkQuantity(raw, { label, errors, field }) {
  const parsed = readNumber(raw);
  if (parsed.blank) return;
  if (parsed.invalid || !Number.isInteger(parsed.value) || parsed.value < 0 || parsed.value > MAX_QUANTITY) {
    errors.push({ field, message: `${label} must be a whole number of zero or more.` });
  }
}

// Returns every problem found as `{ field, message }`; an empty list means the payload is fine.
// An ACTIVE product is on sale, so its prices must be above zero; DRAFT and ARCHIVED may be 0.
export function validateProductPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [{ field: "payload", message: "Send the product as a JSON object." }];
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (!title) errors.push({ field: "title", message: "Title is required." });
  else if (title.length > MAX_TITLE_LENGTH) {
    errors.push({ field: "title", message: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` });
  }

  const handle = typeof payload.handle === "string" ? payload.handle.trim() : "";
  if (!handle) {
    errors.push({ field: "handle", message: "The URL handle is empty. Use a title or handle with letters or numbers." });
  } else if (handle.length > MAX_HANDLE_LENGTH) {
    errors.push({ field: "handle", message: `The URL handle must be ${MAX_HANDLE_LENGTH} characters or fewer.` });
  }

  if (!PRODUCT_STATUSES.includes(payload.status)) {
    errors.push({ field: "status", message: `Status must be one of ${PRODUCT_STATUSES.join(", ")}.` });
  }
  const sellable = payload.status === "ACTIVE";

  checkText(payload.product_type, { max: MAX_PRODUCT_TYPE_LENGTH, label: "Product type", errors, field: "product_type" });

  const pricing = payload.pricing || {};
  checkAmount(pricing.price, {
    max: MAX_AMOUNT, label: "Price", errors, field: "price", positive: sellable, required: sellable,
  });
  checkAmount(pricing.compare_at_price, { max: MAX_AMOUNT, label: "Compare-at price", errors, field: "compare_at_price" });
  checkAmount(pricing.cost_per_item, { max: MAX_AMOUNT, label: "Cost per item", errors, field: "cost_per_item" });

  checkText(payload.inventory?.sku, { max: MAX_SKU_LENGTH, label: "SKU", errors, field: "sku" });
  checkText(payload.inventory?.barcode, { max: MAX_SKU_LENGTH, label: "Barcode", errors, field: "barcode" });

  const shipping = payload.shipping || {};
  checkAmount(shipping.weight, { max: MAX_WEIGHT, label: "Weight", errors, field: "weight" });
  checkWeightUnit(shipping.weight_unit, { label: "Weight unit", errors, field: "weight_unit" });
  checkText(shipping.hs_code, { max: 20, label: "HS code", errors, field: "hs_code" });

  checkText(payload.seo?.title, { max: MAX_SEO_TITLE_LENGTH, label: "SEO title", errors, field: "seo_title" });
  checkText(payload.seo?.description, {
    max: MAX_SEO_DESCRIPTION_LENGTH, label: "SEO description", errors, field: "seo_description",
  });

  const variants = payload.variants ?? [];
  if (!Array.isArray(variants)) {
    errors.push({ field: "variants", message: "Variants must be a list." });
  } else if (variants.length > MAX_VARIANTS) {
    errors.push({ field: "variants", message: `A product can have at most ${MAX_VARIANTS} variants.` });
  } else {
    variants.forEach((variant, index) => {
      const label = (what) => `Variant ${index + 1}: ${what}`;
      if (!variant || typeof variant !== "object") {
        errors.push({ field: "variants", message: label("is not a valid variant.") });
        return;
      }
      checkAmount(variant.price, {
        max: MAX_AMOUNT, label: label("price"), errors, field: "variants", positive: sellable, required: sellable,
      });
      checkAmount(variant.compare_at_price, {
        max: MAX_AMOUNT, label: label("compare-at price"), errors, field: "variants",
      });
      checkQuantity(variant.inventory_quantity, { label: label("quantity"), errors, field: "variants" });
      checkAmount(variant.weight, { max: MAX_WEIGHT, label: label("weight"), errors, field: "variants" });
      checkWeightUnit(variant.weight_unit, { label: label("weight unit"), errors, field: "variants" });
      checkText(variant.sku, { max: MAX_SKU_LENGTH, label: label("SKU"), errors, field: "variants" });
    });
  }

  return errors;
}

// The messages as one sentence-per-problem string, capped so a bad bulk payload stays readable.
export function describeProductErrors(errors, limit = 3) {
  const shown = errors.slice(0, limit).map((e) => e.message);
  const rest = errors.length - shown.length;
  return rest > 0 ? `${shown.join(" ")} (and ${rest} more problem${rest === 1 ? "" : "s"})` : shown.join(" ");
}
