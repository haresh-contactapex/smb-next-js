// Pure review constants — no DB access, safe to import from both server code
// (src/lib/reviews.js) and "use client" components.

export const RATING_MIN = 1;
export const RATING_MAX = 5;

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

export function isValidRating(value) {
  return Number.isInteger(value) && value >= RATING_MIN && value <= RATING_MAX;
}
