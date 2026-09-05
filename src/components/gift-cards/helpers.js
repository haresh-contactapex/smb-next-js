const CODE_PATTERN = /^GC-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function formatCurrency(amount) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function normalizeGiftCardCode(value) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = (cleaned.startsWith("GC") ? cleaned.slice(2) : cleaned).slice(0, 8);
  const chunks = body.match(/.{1,4}/g) || [];
  return ["GC", ...chunks].join("-");
}

export function isValidGiftCardCode(code) {
  return CODE_PATTERN.test(code);
}

export const STATUS_LABELS = {
  active: { label: "Active", className: "bg-success/10 text-success" },
  redeemed: { label: "Redeemed", className: "bg-slate-100 dark:bg-white/5 text-slate-400" },
  expired: { label: "Expired", className: "bg-error/10 text-error" },
};
