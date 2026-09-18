"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CategoriesFilters from "./CategoriesFilters";
import CategoriesTable from "./CategoriesTable";

export default function CategoriesListing({ categories: initialCategories }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [search, setSearch] = useState("");
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);

  async function handleDelete(category) {
    if (!window.confirm(`Delete "${category.name}"? This can't be undone.`)) return;
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete category");
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    }
  }

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
        <CategoriesTable categories={filtered} onDelete={handleDelete} />
      </section>
    </>
  );
}
