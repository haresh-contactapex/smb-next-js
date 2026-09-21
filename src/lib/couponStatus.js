// Pure date-only coupon status logic — no DB access, safe to import from
// both server code (src/lib/coupons.js) and "use client" form components.

export function todayISODate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Status is always derived from the date range, never chosen manually:
// past end date wins (EXPIRED), a future start date means it hasn't
// started yet (SCHEDULED), otherwise it's live now (ACTIVE). Dates are
// plain "YYYY-MM-DD" strings, which compare correctly lexicographically.
export function computeCouponStatus(startDate, endDate, today = todayISODate()) {
  if (endDate && today > endDate) return "EXPIRED";
  if (startDate && today < startDate) return "SCHEDULED";
  return "ACTIVE";
}

export const STATUS_LABELS = {
  ACTIVE: "Active",
  SCHEDULED: "Scheduled",
  DRAFT: "Draft",
  EXPIRED: "Expired",
};

export const STATUS_BADGE_CLASSES = {
  ACTIVE: "bg-success/10 text-success",
  SCHEDULED: "bg-info/10 text-info",
  DRAFT: "bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-slate-300",
  EXPIRED: "bg-error/10 text-error",
};
