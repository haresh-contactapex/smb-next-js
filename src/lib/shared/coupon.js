// Rules for a coupon payload, enforced by the server on every create/update and reused by the
// Create Coupon form so both give the same answer. Pure: no React, DOM or database access.

export const COUPON_TYPES = ["percentage", "fixed", "free_shipping"];
export const COUPON_APPLIES_TO = ["ALL", "CATEGORY"];
export const MAX_COUPON_CODE_LENGTH = 20;

// DECIMAL(12, 2) holds fewer than this; usage_limit is a 32-bit INTEGER.
const MAX_AMOUNT = 1e10;
const MAX_USAGE_LIMIT = 2147483647;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

// What a code looks like once stored: upper-case letters and digits only.
export function normalizeCouponCode(raw) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, MAX_COUPON_CODE_LENGTH);
}

function readNumber(raw) {
  if (isBlank(raw)) return { blank: true };
  if (typeof raw !== "number" && typeof raw !== "string") return { invalid: true };
  const value = Number(String(raw).trim());
  return Number.isFinite(value) ? { value } : { invalid: true };
}

// A real calendar date written "YYYY-MM-DD" ("2026-02-31" is not one).
export function isValidIsoDate(value) {
  const match = DATE_PATTERN.exec(String(value));
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Returns every problem found as `{ field, message }`; an empty list means the payload is fine.
export function validateCouponPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [{ field: "payload", message: "Send the coupon as a JSON object." }];
  }
  const add = (field, message) => errors.push({ field, message });

  if (!normalizeCouponCode(payload.code)) add("code", "Enter a coupon code using letters or numbers.");

  if (!COUPON_TYPES.includes(payload.type)) {
    add("type", `Discount type must be one of ${COUPON_TYPES.join(", ")}.`);
  } else if (payload.type !== "free_shipping") {
    const value = readNumber(payload.value);
    if (value.blank) add("value", "Enter the discount value.");
    else if (value.invalid || value.value <= 0 || value.value >= MAX_AMOUNT) {
      add("value", "The discount value must be a number greater than zero.");
    } else if (payload.type === "percentage" && value.value > 100) {
      add("value", "A percentage discount can't be more than 100.");
    }
  }

  const minPurchase = readNumber(payload.minPurchase);
  if (!minPurchase.blank && (minPurchase.invalid || minPurchase.value < 0 || minPurchase.value >= MAX_AMOUNT)) {
    add("minPurchase", "The minimum purchase must be a number of zero or more.");
  }

  const usageLimit = readNumber(payload.usageLimit);
  if (
    !usageLimit.blank &&
    (usageLimit.invalid || !Number.isInteger(usageLimit.value) || usageLimit.value < 1 || usageLimit.value > MAX_USAGE_LIMIT)
  ) {
    add("usageLimit", "The usage limit must be a whole number of 1 or more.");
  }

  if (payload.onePerCustomer !== undefined && typeof payload.onePerCustomer !== "boolean") {
    add("onePerCustomer", "One use per customer must be true or false.");
  }

  const startDate = isBlank(payload.startDate) ? null : payload.startDate;
  const endDate = isBlank(payload.endDate) ? null : payload.endDate;
  const startOk = startDate === null || isValidIsoDate(startDate);
  const endOk = endDate === null || isValidIsoDate(endDate);
  if (!startOk) add("startDate", "The start date must be a valid date (YYYY-MM-DD).");
  if (!endOk) add("endDate", "The end date must be a valid date (YYYY-MM-DD).");
  if (startOk && endOk && startDate && endDate && endDate < startDate) {
    add("endDate", "End date can't be before the start date.");
  }

  if (payload.appliesTo !== undefined && !COUPON_APPLIES_TO.includes(payload.appliesTo)) {
    add("appliesTo", `Applies to must be one of ${COUPON_APPLIES_TO.join(", ")}.`);
  } else if (payload.appliesTo === "CATEGORY" && !UUID_PATTERN.test(String(payload.categoryId ?? ""))) {
    add("categoryId", "Choose the category this coupon applies to.");
  }

  if (!isBlank(payload.description) && typeof payload.description !== "string") {
    add("description", "The description must be text.");
  }

  return errors;
}
