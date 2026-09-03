const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount) {
  return inr.format(amount);
}

export function formatCouponValue(coupon) {
  if (coupon.type === "percentage") return `${coupon.value}% off`;
  if (coupon.type === "fixed") return `${formatINR(coupon.value)} off`;
  return "Free shipping";
}

export function formatDateRange(startDate, endDate) {
  const fmt = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  if (!startDate && !endDate) return "Not scheduled";
  if (startDate && !endDate) return `From ${fmt(startDate)}`;
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

export function computeCouponStats(coupons) {
  return {
    total: coupons.length,
    active: coupons.filter((c) => c.status === "Active").length,
    scheduled: coupons.filter((c) => c.status === "Scheduled").length,
    expired: coupons.filter((c) => c.status === "Expired").length,
  };
}

export const STATUS_BADGE_CLASSES = {
  Active: "bg-success/10 text-success",
  Scheduled: "bg-info/10 text-info",
  Draft: "bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-slate-300",
  Expired: "bg-error/10 text-error",
};

export const TYPE_LABELS = {
  percentage: "Percentage",
  fixed: "Fixed amount",
  free_shipping: "Free shipping",
};

export const TYPE_ICONS = {
  percentage: "percent",
  fixed: "dollar-sign",
  free_shipping: "truck",
};
