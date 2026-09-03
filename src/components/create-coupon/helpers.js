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
  status: "ACTIVE",
  startDate: "",
  endDateEnabled: false,
  endDate: "",
  appliesTo: "all",
  category: "",
};
