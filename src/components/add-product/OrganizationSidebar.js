"use client";

import { useEffect, useState } from "react";
import { TAXONOMY, COLLECTIONS } from "@/data/addProductData";

export default function OrganizationSidebar({
  category,
  productType,
  vendor,
  collections,
  tags,
  onFieldChange,
  onCategorySelect,
  onCategoryClear,
  onCollectionsChange,
  onTagsChange,
}) {
  const [categoryQuery, setCategoryQuery] = useState(category ? category.split(" > ").pop() : "");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setCategoryQuery(category ? category.split(" > ").pop() : "");
  }, [category]);

  const q = categoryQuery.trim().toLowerCase();
  const categoryMatches = (q ? TAXONOMY.filter((c) => c.toLowerCase().includes(q)) : TAXONOMY).slice(0, 8);

  const cq = collectionQuery.trim().toLowerCase();
  const collectionMatches = COLLECTIONS.filter(
    (c) => !collections.includes(c) && (!cq || c.toLowerCase().includes(cq))
  ).slice(0, 8);

  function selectCategory(path) {
    onCategorySelect(path);
    setCategoryQuery(path.split(" > ").pop());
    setCategoryOpen(false);
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
        <div className="relative">
          <label className="field-label" htmlFor="f-category">
            Product category
          </label>
          <input
            id="f-category"
            type="text"
            placeholder="Search category"
            autoComplete="off"
            aria-label="Product category"
            value={categoryQuery}
            onFocus={() => setCategoryOpen(true)}
            onChange={(e) => {
              setCategoryQuery(e.target.value);
              onCategoryClear();
              setCategoryOpen(true);
            }}
            onBlur={() => setTimeout(() => setCategoryOpen(false), 150)}
            className="field-input"
          />
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
          {category && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 system-field">{category}</p>
          )}
          <p className="text-[11px] text-slate-400 mt-1.5">
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

        <div>
          <label className="field-label" htmlFor="f-vendor">
            Vendor
          </label>
          <input
            id="f-vendor"
            type="text"
            placeholder="e.g. Example Brand"
            aria-label="Vendor"
            value={vendor}
            onChange={(e) => onFieldChange("vendor", e.target.value)}
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
