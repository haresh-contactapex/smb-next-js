"use client";

import { useMemo, useState } from "react";
import CategoriesFilters from "./CategoriesFilters";
import CategoriesTable from "./CategoriesTable";

export default function CategoriesListing({ categories }) {
  const [search, setSearch] = useState("");
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((cat) => {
      if (q && !cat.name.toLowerCase().includes(q) && !cat.slug.toLowerCase().includes(q)) return false;
      if (showHiddenOnly && cat.visible) return false;
      return true;
    });
  }, [categories, search, showHiddenOnly]);

  return (
    <>
      <CategoriesFilters
        search={search}
        onSearchChange={setSearch}
        showHiddenOnly={showHiddenOnly}
        onToggleHidden={setShowHiddenOnly}
        resultCount={filtered.length}
      />

      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <CategoriesTable categories={filtered} />
      </section>
    </>
  );
}
