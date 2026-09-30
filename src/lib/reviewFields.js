// Pure review constants — no DB access, safe to import from both server code
// (src/lib/reviews.js) and "use client" components.

// Ratings are whole or half stars: 0.5, 1, 1.5 … 5.
export const RATING_MIN = 0.5;
export const RATING_MAX = 5;
export const RATING_STEP = 0.5;

// Every selectable rating, lowest first.
export const RATING_VALUES = Array.from(
  { length: Math.round((RATING_MAX - RATING_MIN) / RATING_STEP) + 1 },
  (_, i) => RATING_MIN + i * RATING_STEP
);

// Keep in sync with the column sizes in docs/reviews/reviews-table-only.sql.
export const MAX_TITLE_LENGTH = 150;
export const MAX_CONTENT_LENGTH = 5000;
export const MAX_DISPLAY_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254;

export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export const STATUS_LABELS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const STATUS_BADGE_CLASSES = {
  PENDING: "bg-warning/10 text-warning",
  APPROVED: "bg-success/10 text-success",
  REJECTED: "bg-error/10 text-error",
};

// Exactly a whole or half star. Halving is exact in binary floating point,
// so 3.5 passes and 3.3 or 3.51 do not.
export function isValidRating(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= RATING_MIN &&
    value <= RATING_MAX &&
    Number.isInteger(value / RATING_STEP)
  );
}

// "4" for a whole star, "3.5" for a half — never "4.0".
export function formatRating(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
