"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/admin-panel/Icon";
import SectionCard from "@/components/settings-shared/SectionCard";
import { CATEGORY_SEARCH_ID, focusControl } from "./helpers";

const MAX_RESULTS = 8;
const RESULTS_ID = "engraving-category-results";

const productCountText = (count) => `${count} ${count === 1 ? "product" : "products"}`;
const removeButtonId = (id) => `engraving-category-remove-${id}`;

// `selectedIds` may hold ids that no longer exist in `categories`; those are not shown and are
// dropped when the form is saved (see toSavePayload).
export default function CategoriesSection({ categories, selectedIds, onChange, disabled = false, status = "ready" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [focusRequest, setFocusRequest] = useState(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  const sorted = useMemo(() => [...categories].sort((a, b) => a.path.localeCompare(b.path)), [categories]);
  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selected = useMemo(
    () => sorted.filter((category) => selectedIdSet.has(category.id)),
    [sorted, selectedIdSet]
  );
  const missingCount = selectedIds.filter((id) => !byId.has(id)).length;

  const q = query.trim().toLowerCase();
  const available = sorted.filter(
    (category) =>
      !selectedIdSet.has(category.id) &&
      (!q || category.name.toLowerCase().includes(q) || category.path.toLowerCase().includes(q))
  );
  const matches = available.slice(0, MAX_RESULTS);

  useEffect(() => {
    if (focusRequest) focusControl(focusRequest.id);
  }, [focusRequest]);

  function addCategory(category) {
    if (selectedIdSet.has(category.id)) return;
    onChange([...selectedIds, category.id]);
    setQuery("");
    setAnnouncement(`${category.path} added. ${selected.length + 1} selected.`);
    // The row that was just used disappears from the results, so focus goes back to the search box.
    setFocusRequest({ id: CATEGORY_SEARCH_ID });
  }

  function removeCategory(category) {
    const index = selected.findIndex((item) => item.id === category.id);
    const neighbour = selected[index + 1] || selected[index - 1];
    onChange(selectedIds.filter((id) => id !== category.id));
    setAnnouncement(`${category.path} removed. ${selected.length - 1} selected.`);
    setFocusRequest({ id: neighbour ? removeButtonId(neighbour.id) : CATEGORY_SEARCH_ID });
  }

  function handleInputKeyDown(e) {
    if (e.key === "Enter") {
      // Adds the top match instead of submitting anything.
      e.preventDefault();
      if (q && matches.length > 0) addCategory(matches[0]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      resultsRef.current?.querySelector("button[data-result]")?.focus();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleResultKeyDown(e) {
    const buttons = [...(resultsRef.current?.querySelectorAll("button[data-result]") || [])];
    const index = buttons.indexOf(e.currentTarget);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      buttons[Math.min(index + 1, buttons.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index <= 0) inputRef.current?.focus();
      else buttons[index - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      inputRef.current?.focus();
    }
  }

  function handleBlur(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
  }

  const resultsVisible = open && !disabled;

  return (
    <SectionCard title="Engraving Categories">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Products in these categories, and in their sub-categories, offer engraving automatically. A product can still
        override this in its own Engraving setting: Inherit (use the categories), Enabled or Disabled.
      </p>

      <div onBlur={handleBlur}>
        <label className="field-label" htmlFor={CATEGORY_SEARCH_ID}>
          Search categories
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon name="search" className="w-4 h-4" />
          </span>
          <input
            ref={inputRef}
            id={CATEGORY_SEARCH_ID}
            type="text"
            value={query}
            autoComplete="off"
            placeholder="Type a category name"
            aria-label="Search categories"
            aria-controls={RESULTS_ID}
            aria-describedby="engraving-category-search-hint"
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onClick={() => setOpen(true)}
            onKeyDown={handleInputKeyDown}
            className={`field-input pl-10${disabled ? " opacity-50 cursor-not-allowed" : ""}`}
          />
        </div>
        <p id="engraving-category-search-hint" className="text-xs text-slate-400 mt-1">
          Press Enter to add the first match, or the down arrow to browse the list.
        </p>

        <div id={RESULTS_ID} ref={resultsRef}>
          {resultsVisible && (
            <div className="mt-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-darksurface shadow-card p-1">
              {matches.length > 0 ? (
                <ul aria-label="Matching categories">
                  {matches.map((category) => (
                    <li key={category.id}>
                      <button
                        type="button"
                        data-result
                        aria-label={`Add ${category.path} to engraving categories`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addCategory(category)}
                        onKeyDown={handleResultKeyDown}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-primary-50 focus-visible:bg-primary-50 dark:hover:bg-accent-500/10 dark:focus-visible:bg-accent-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-accent-500"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 break-words">
                            {category.name}
                          </span>
                          {category.path !== category.name && (
                            <span className="block text-[11px] text-slate-400 break-words">{category.path}</span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">{productCountText(category.productCount)}</span>
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary-500 dark:text-accent-400">
                          <Icon name="plus-circle" className="w-4 h-4" />
                          <span className="hidden sm:inline">Add</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2.5 text-sm text-slate-400">
                  {status !== "ready"
                    ? "Categories are not available yet."
                    : categories.length === 0
                      ? "There are no categories yet."
                      : q
                        ? `No categories match "${query.trim()}".`
                        : "Every category is already selected."}
                </p>
              )}
              {available.length > MAX_RESULTS && (
                <p className="px-3 py-1.5 text-[11px] text-slate-400">
                  Showing {MAX_RESULTS} of {available.length} categories. Keep typing to narrow the list.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Selected categories
          </h3>
          <p aria-live="polite" className="text-xs text-slate-500 dark:text-slate-400">
            {selected.length} {selected.length === 1 ? "category" : "categories"} selected
          </p>
        </div>

        {selected.length > 0 ? (
          <ul className="space-y-1.5 max-h-80 overflow-y-auto custom-scroll pr-1">
            {selected.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-white break-words">{category.name}</p>
                  {category.path !== category.name && (
                    <p className="text-[11px] text-slate-400 break-words">{category.path}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {productCountText(category.productCount)}
                </span>
                <button
                  type="button"
                  id={removeButtonId(category.id)}
                  aria-label={`Remove ${category.name} from engraving categories`}
                  title="Remove"
                  disabled={disabled}
                  onClick={() => removeCategory(category)}
                  className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-error dark:hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  <Icon name="x" className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 px-4 py-5 text-center text-sm text-slate-500 dark:text-slate-400">
            {status === "loading"
              ? "Loading categories..."
              : status === "error"
                ? "Categories could not be loaded."
                : "No categories selected - engraving only appears on products set to Enabled"}
          </p>
        )}

        {missingCount > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
            {missingCount} selected {missingCount === 1 ? "category no longer exists" : "categories no longer exist"} and
            will be removed when you save.
          </p>
        )}
      </div>

      <p className="sr-only" role="status">
        {announcement}
      </p>
    </SectionCard>
  );
}
