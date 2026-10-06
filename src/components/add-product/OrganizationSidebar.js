"use client";

import { useEffect, useState } from "react";
import { COLLECTIONS } from "@/data/addProductData";

// Turns a category row from GET /api/categories into the same "A > B > C"
// display path used elsewhere (see add-category/HierarchySidebar.js) so it
// matches the string format the rest of this form already stores/parses.
function categoryPath(cat) {
  return cat.parentPath ? `${cat.parentPath} > ${cat.name}` : cat.name;
}

export default function OrganizationSidebar({
  categories,
  categoryError,
  categoryInputRef,
  productType,
  collections,
  tags,
  onFieldChange,
  onCategoriesChange,
  onCollectionsChange,
  onTagsChange,
}) {
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryPaths, setCategoryPaths] = useState([]);
  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json.success) return;
        setCategoryPaths(json.data.map(categoryPath).sort());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const q = categoryQuery.trim().toLowerCase();
  const selectedCategoryKeys = new Set(categories.map((c) => c.toLowerCase()));
  const categoryMatches = categoryPaths
    .filter((c) => !selectedCategoryKeys.has(c.toLowerCase()) && (!q || c.toLowerCase().includes(q)))
    .slice(0, 8);

  const cq = collectionQuery.trim().toLowerCase();
  const collectionMatches = COLLECTIONS.filter(
    (c) => !collections.includes(c) && (!cq || c.toLowerCase().includes(cq))
  ).slice(0, 8);

  // The panel stays open after a pick (the picked one drops out of the list),
  // so several categories can be added in a row.
  function selectCategory(path) {
    onCategoriesChange([...categories, path]);
    setCategoryQuery("");
  }

  function removeCategory(index) {
    onCategoriesChange(categories.filter((_, i) => i !== index));
  }

  function handleCategoryKeyDown(e) {
    if (e.key === "Backspace" && !categoryQuery && categories.length) {
      onCategoriesChange(categories.slice(0, -1));
    } else if (e.key === "Enter" && q && categoryMatches.length) {
      // Picks the top suggestion instead of submitting the whole form.
      e.preventDefault();
      selectCategory(categoryMatches[0]);
    } else if (e.key === "Escape") {
      setCategoryOpen(false);
    }
  }

  function selectCollection(name) {
    onCollectionsChange([...collections, name]);
    setCollectionQuery("");
    setCollectionsOpen(false);
  }

  function removeCollection(index) {
    onCollectionsChange(collections.filter((_, i) => i !== index));
  }

  function handleCollectionKeyDown(e) {
    if (e.key === "Backspace" && !collectionQuery && collections.length) {
      onCollectionsChange(collections.slice(0, -1));
    }
  }

  function removeTag(index) {
    onTagsChange(tags.filter((_, i) => i !== index));
  }

  function handleTagKeyDown(e) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim().replace(/,$/, "");
      if (val && !tags.includes(val)) onTagsChange([...tags, val]);
      setTagInput("");
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      onTagsChange(tags.slice(0, -1));
    }
  }

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Organization</h2>
      <div className="space-y-4">
        <div>
          <label className="field-label" htmlFor="f-category">
            Product categories
          </label>
          <div className="relative">
            <div
              className={`flex flex-wrap gap-1.5 rounded-xl border px-2.5 py-2 min-h-[42px] transition-all ${
                categoryError
                  ? "border-red-400 bg-red-50 dark:bg-red-500/10"
                  : "border-transparent bg-slate-100 dark:bg-darksurface2 focus-within:border-primary-400 dark:focus-within:border-accent-500 focus-within:bg-white dark:focus-within:bg-darksurface2"
              }`}
            >
              {categories.map((path, i) => (
                <span key={path} className="chip min-w-0 max-w-full !rounded-2xl">
                  <span className="min-w-0 break-words">{path}</span>
                  {i === 0 && categories.length > 1 && (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide opacity-70">Primary</span>
                  )}
                  <button
                    type="button"
                    className="shrink-0"
                    aria-label={`Remove category ${path}`}
                    onClick={() => removeCategory(i)}
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                ref={categoryInputRef}
                id="f-category"
                type="text"
                placeholder={categories.length ? "Add another category" : "Search categories"}
                autoComplete="off"
                aria-label="Search categories"
                aria-invalid={categoryError || undefined}
                aria-describedby={categoryError ? "f-category-error" : undefined}
                value={categoryQuery}
                onFocus={() => setCategoryOpen(true)}
                onChange={(e) => {
                  setCategoryQuery(e.target.value);
                  setCategoryOpen(true);
                }}
                onKeyDown={handleCategoryKeyDown}
                onBlur={() => setTimeout(() => setCategoryOpen(false), 150)}
                className="flex-1 min-w-[100px] bg-transparent border-none focus:outline-none focus:ring-0 px-1 py-0.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>
            {categoryOpen && categoryMatches.length > 0 && (
              <div className="suggest-panel bg-white dark:bg-darksurface border border-slate-200 dark:border-white/10 rounded-xl shadow-popover custom-scroll py-1">
                {categoryMatches.map((path) => {
                  const parts = path.split(" > ");
                  return (
                    <button
                      key={path}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCategory(path)}
                      className="suggest-item w-full text-left px-3 py-2 text-sm flex flex-col"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-200">{parts[parts.length - 1]}</span>
                      <span className="text-[11px] text-slate-400">{path}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {categoryError && (
            <p id="f-category-error" className="text-xs text-error mt-1">
              Add at least one category.
            </p>
          )}
          <p className="text-[11px] text-slate-400 mt-1.5">
            Add every category this product belongs to; the first is its primary category.
            Determines tax rates and adds attributes to improve search, filters, and cross-channel sales.
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="f-type">
            Product type
          </label>
          <input
            id="f-type"
            type="text"
            placeholder="e.g. Backpacks"
            aria-label="Product type"
            value={productType}
            onChange={(e) => onFieldChange("product_type", e.target.value)}
            className="field-input"
          />
        </div>

        <div className="relative">
          <label className="field-label">Collections</label>
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus-within:border-primary-400 dark:focus-within:border-accent-500 focus-within:bg-white dark:focus-within:bg-darksurface2 px-2.5 py-2 min-h-[42px] transition-all">
            {collections.map((name, i) => (
              <span key={name} className="chip">
                <span>{name}</span>
                <button type="button" aria-label={`Remove ${name}`} onClick={() => removeCollection(i)}>
                  &times;
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder="Search collections"
              autoComplete="off"
              aria-label="Search collections"
              value={collectionQuery}
              onFocus={() => setCollectionsOpen(true)}
              onChange={(e) => {
                setCollectionQuery(e.target.value);
                setCollectionsOpen(true);
              }}
              onKeyDown={handleCollectionKeyDown}
              onBlur={() => setTimeout(() => setCollectionsOpen(false), 150)}
              className="flex-1 min-w-[100px] bg-transparent border-none focus:outline-none focus:ring-0 px-1 py-0.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
            />
          </div>
          {collectionsOpen && collectionMatches.length > 0 && (
            <div className="suggest-panel bg-white dark:bg-darksurface border border-slate-200 dark:border-white/10 rounded-xl shadow-popover custom-scroll py-1">
              {collectionMatches.map((name) => (
                <button
                  key={name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectCollection(name)}
                  className="suggest-item w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="f-tag-input">
            Tags
          </label>
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus-within:border-primary-400 dark:focus-within:border-accent-500 focus-within:bg-white dark:focus-within:bg-darksurface2 px-2.5 py-2 min-h-[42px] transition-all">
            {tags.map((tag, i) => (
              <span key={tag} className="chip">
                <span>{tag}</span>
                <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => removeTag(i)}>
                  &times;
                </button>
              </span>
            ))}
            <input
              id="f-tag-input"
              type="text"
              placeholder="Add a tag, press Enter"
              aria-label="Add tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="flex-1 min-w-[100px] bg-transparent border-none focus:outline-none focus:ring-0 px-1 py-0.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
