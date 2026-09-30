import { RATING_VALUES, REVIEW_STATUSES, STATUS_BADGE_CLASSES, STATUS_LABELS, formatRating } from "@/lib/reviewFields";

export { STATUS_LABELS, STATUS_BADGE_CLASSES, REVIEW_STATUSES, formatRating };

// Every selectable rating, highest first.
export const RATING_FILTER_OPTIONS = [...RATING_VALUES].reverse();

export function formatReviewDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// The average only counts APPROVED reviews — those are the ones shoppers see.
export function computeReviewStats(reviews) {
  const approved = reviews.filter((r) => r.status === "APPROVED");
  const average = approved.length ? approved.reduce((sum, r) => sum + r.rating, 0) / approved.length : null;
  return {
    total: reviews.length,
    pending: reviews.filter((r) => r.status === "PENDING").length,
    approved: approved.length,
    averageRating: average === null ? null : Math.round(average * 10) / 10,
  };
}
