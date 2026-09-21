export function formatCode(str) {
  return String(str)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 20);
}

const RANDOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCouponCode() {
  let code = "SAVE";
  for (let i = 0; i < 6; i++) {
    code += RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
  }
  return code;
}

export const DEFAULT_COUPON = {
  code: "",
  description: "",
  type: "percentage",
  value: "",
  minPurchase: "",
  usageLimitEnabled: false,
  usageLimit: "",
  onePerCustomer: true,
  startDate: "",
  endDateEnabled: false,
  endDate: "",
  appliesTo: "all",
  categoryId: "",
};

export function buildCouponFromData(data) {
  return {
    code: data.code || "",
    description: data.description || "",
    type: data.type || "percentage",
    value: data.value ?? "",
    minPurchase: data.minPurchase ?? "",
    usageLimitEnabled: data.usageLimit !== null && data.usageLimit !== undefined,
    usageLimit: data.usageLimit ?? "",
    onePerCustomer: data.onePerCustomer ?? true,
    startDate: data.startDate || "",
    endDateEnabled: Boolean(data.endDate),
    endDate: data.endDate || "",
    appliesTo: data.appliesTo === "CATEGORY" ? "category" : "all",
    categoryId: data.categoryId || "",
  };
}

// Status isn't included: it's derived server-side from the date range on
// every create/update, never taken from the client.
export function assembleCoupon(coupon) {
  return {
    code: formatCode(coupon.code),
    description: coupon.description || "",
    type: coupon.type,
    value: coupon.type === "free_shipping" ? "" : coupon.value,
    minPurchase: coupon.minPurchase,
    usageLimit: coupon.usageLimitEnabled ? coupon.usageLimit : "",
    onePerCustomer: coupon.onePerCustomer,
    startDate: coupon.startDate || "",
    endDate: coupon.endDateEnabled ? coupon.endDate : "",
    appliesTo: coupon.appliesTo === "category" ? "CATEGORY" : "ALL",
    categoryId: coupon.appliesTo === "category" ? coupon.categoryId : "",
  };
}
