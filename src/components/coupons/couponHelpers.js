import { formatCurrency } from "@/lib/currency";

export function formatCouponValue(coupon, currency) {
  if (coupon.type === "percentage") return `${coupon.value}% off`;
  if (coupon.type === "fixed") return `${formatCurrency(coupon.value, currency)} off`;
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
    active: coupons.filter((c) => c.status === "ACTIVE").length,
    scheduled: coupons.filter((c) => c.status === "SCHEDULED").length,
    expired: coupons.filter((c) => c.status === "EXPIRED").length,
  };
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
