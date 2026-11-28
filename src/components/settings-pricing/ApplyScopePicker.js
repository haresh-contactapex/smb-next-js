"use client";

import { useRef, useState } from "react";
import { PRICING_SCOPES } from "./helpers";

// "Apply To": every product, or only the chosen categories. Categories are fetched the first time
// "Specific Categories" is picked, not on every page visit. Shared by the plain price adjustment
// and the per-metal one, each keeping its own selection.
export default function ApplyScopePicker({
  scope,
  onScopeChange,
  categoryIds,
  onCategoryIdsChange,
  onCategoriesLoaded,
  disabled = false,
}) {
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const categoriesLoadedRef = useRef(false);

  async function loadCategories() {
    setCategoriesLoading(true);
    setCategoriesError("");
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load categories");
      const loaded = Array.isArray(json.data) ? json.data : [];
      setCategories(loaded);
      onCategoriesLoaded?.(loaded);
      categoriesLoadedRef.current = true;
    } catch (error) {
      setCategoriesError(error.message);
    } finally {
      setCategoriesLoading(false);
    }
  }

  function handleScopeChange(value) {
    onScopeChange(value);
    if (value === "categories" && !categoriesLoadedRef.current && !categoriesLoading) {
      loadCategories();
    }
  }

  function toggleCategory(id) {
    onCategoryIdsChange(categoryIds.includes(id) ? categoryIds.filter((existing) => existing !== id) : [...categoryIds, id]);
  }

  const categoryQueryLower = categoryQuery.trim().toLowerCase();
  const filteredCategories = categories
    .filter(
      (category) =>
        !categoryQueryLower ||
        category.name.toLowerCase().includes(categoryQueryLower) ||
        (category.parentPath || "").toLowerCase().includes(categoryQueryLower)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-3">
      <div>
        <label className="field-label">Apply To</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRICING_SCOPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleScopeChange(option.value)}
              disabled={disabled}
              className={`h-9 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50 disabled:pointer-events-none ${
                scope === option.value
                  ? "bg-primary-500 dark:bg-accent-500 text-white border-transparent"
                  : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {scope === "categories" && (
        <div className="space-y-2">
          <input
            type="text"
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
            placeholder="Search categories"
            aria-label="Search categories"
            className="field-input"
            disabled={categoriesLoading}
          />

          {categoriesError ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              <span>{categoriesError}</span>
              <button type="button" onClick={loadCategories} className="font-semibold underline shrink-0">
                Retry
              </button>
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto custom-scroll border border-slate-200 dark:border-white/10 rounded-xl divide-y divide-slate-100 dark:divide-white/5">
              {categoriesLoading ? (
                <p className="px-3 py-3 text-xs text-slate-400">Loading categories…</p>
              ) : filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={categoryIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-white/20 text-primary-500 dark:text-accent-500 focus:ring-primary-400 dark:focus:ring-accent-500"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-slate-700 dark:text-slate-200 truncate">{category.name}</span>
                      {category.parentPath && (
                        <span className="block text-[11px] text-slate-400 truncate">{category.parentPath}</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">{category.productCount} products</span>
                  </label>
                ))
              ) : (
                <p className="px-3 py-3 text-xs text-slate-400">
                  {categories.length === 0 ? "There are no categories yet." : `No categories match "${categoryQuery.trim()}".`}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {categoryIds.length} {categoryIds.length === 1 ? "category" : "categories"} selected
          </p>
        </div>
      )}
    </div>
  );
}
