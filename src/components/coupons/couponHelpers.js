import { formatCurrency } from "@/lib/currency";
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from "@/lib/couponStatus";

export { STATUS_LABELS, STATUS_BADGE_CLASSES };

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
