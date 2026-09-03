const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount) {
  return inr.format(amount);
}

export function getStockInfo(inventory) {
  if (inventory <= 0) return { label: "Out of stock", level: "out" };
  if (inventory <= 10) return { label: `${inventory} in stock`, level: "low" };
  return { label: `${inventory} in stock`, level: "ok" };
}

export const STOCK_TEXT_CLASSES = {
  out: "text-error font-medium",
  low: "text-warning font-medium",
  ok: "text-slate-600 dark:text-slate-300",
};

export const STATUS_BADGE_CLASSES = {
  Active: "bg-success/10 text-success",
  Draft: "bg-info/10 text-info",
  Archived: "bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-slate-300",
};

export function computeProductStats(products) {
  return {
    total: products.length,
    active: products.filter((p) => p.status === "Active").length,
    lowStock: products.filter((p) => getStockInfo(p.inventory).level === "low").length,
    outOfStock: products.filter((p) => getStockInfo(p.inventory).level === "out").length,
  };
}
