const ICON_COLORS = ["primary", "accent", "success", "info", "neutral"];

export function pickIconColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ICON_COLORS[hash % ICON_COLORS.length];
}

export function computeCategoryStats(categoriesWithCounts) {
  const leaves = categoriesWithCounts.filter((cat) => cat.parentPath !== null);
  return {
    total: categoriesWithCounts.length,
    visible: categoriesWithCounts.filter((cat) => cat.visible).length,
    hidden: categoriesWithCounts.filter((cat) => !cat.visible).length,
    empty: leaves.filter((cat) => cat.productCount === 0).length,
  };
}

export const VISIBILITY_BADGE_CLASSES = {
  true: "bg-success/10 text-success",
  false: "bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-slate-300",
};
