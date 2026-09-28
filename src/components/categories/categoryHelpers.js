const ICON_COLORS = ["primary", "accent", "success", "info", "neutral"];

export function pickIconColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ICON_COLORS[hash % ICON_COLORS.length];
}

export function computeCategoryStats(categoriesWithCounts) {
  return {
    total: categoriesWithCounts.length,
    visible: categoriesWithCounts.filter((cat) => cat.visible).length,
    hidden: categoriesWithCounts.filter((cat) => !cat.visible).length,
    // productCount already rolls up descendant products (see listCategories), so a
    // category with 0 here has no products anywhere in its own subtree — top-level
    // or not, that's genuinely empty and should match what the table's Products
    // column shows for that row.
    empty: categoriesWithCounts.filter((cat) => cat.productCount === 0).length,
  };
}

export const VISIBILITY_BADGE_CLASSES = {
  true: "bg-success/10 text-success",
  false: "bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-slate-300",
};
