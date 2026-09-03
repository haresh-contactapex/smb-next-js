export function computeCategoryCounts(categories, products) {
  const directCounts = new Map(
    categories.map((cat) => [cat.id, products.filter((p) => p.category === cat.name).length])
  );

  const isParent = (cat) =>
    categories.some((c) => c.parentPath === cat.name || c.parentPath?.startsWith(`${cat.name} >`));

  return categories.map((cat) => {
    if (!isParent(cat)) return { ...cat, productCount: directCounts.get(cat.id) };
    const productCount = categories
      .filter((c) => c.parentPath === cat.name || c.parentPath?.startsWith(`${cat.name} >`))
      .reduce((sum, c) => sum + directCounts.get(c.id), 0);
    return { ...cat, productCount };
  });
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
