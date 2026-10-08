"use client";

import { useCallback, useMemo, useState } from "react";
import Icon from "./Icon";

/**
 * Shared pieces for "select rows, then delete them together" on admin lists
 * (coupons, reviews, CMS pages, blog posts, media). Same look and behavior as
 * the Customers and Users lists:
 *
 *   const selection = useBulkSelection();
 *   <BulkSelectionBar count={selection.size} ... />
 *   <SelectCheckbox checked={selection.has(id)} onChange={() => selection.toggle(id)} />
 *   await requestBulkDelete("/api/coupons", [...selection.ids], "Failed to delete coupons");
 */

export function SelectCheckbox({ checked, indeterminate = false, disabled = false, onChange, label, title, className = "" }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={label}
      title={title}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      className={`w-4 h-4 rounded cursor-pointer accent-primary-500 dark:accent-accent-500 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    />
  );
}

export function useBulkSelection() {
  const [ids, setIds] = useState(() => new Set());

  const toggle = useCallback((id) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Adds (select = true) or removes every id in `list`, e.g. one page's rows.
  const setMany = useCallback((list, select) => {
    setIds((prev) => {
      const next = new Set(prev);
      for (const id of list) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const replace = useCallback((list) => setIds(new Set(list)), []);
  const clear = useCallback(() => setIds(new Set()), []);
  const remove = useCallback((list) => setMany(list, false), [setMany]);

  return useMemo(
    () => ({ ids, size: ids.size, has: (id) => ids.has(id), toggle, setMany, replace, clear, remove }),
    [ids, toggle, setMany, replace, clear, remove]
  );
}

// Header checkbox state for the rows currently shown.
export function pageSelectionState(selection, visibleIds) {
  const selectedOnPage = visibleIds.filter((id) => selection.has(id)).length;
  const all = visibleIds.length > 0 && selectedOnPage === visibleIds.length;
  return { all, some: selectedOnPage > 0 && !all };
}

/**
 * The bar shown above a list while anything is selected. `noun` is the plural
 * ("coupons"); `matchingCount` is how many rows the current filters show, so
 * "Select all" can reach rows on other pages. The action defaults to Delete;
 * pass `actionLabel` / `busyLabel` / `actionIcon` for another (Cancel orders).
 */
export function BulkSelectionBar({
  count,
  matchingCount,
  noun,
  filtered = false,
  onSelectAll,
  onClear,
  onDelete,
  deleting = false,
  actionLabel = "Delete selected",
  busyLabel = "Deleting…",
  actionIcon = "trash-2",
}) {
  if (count === 0) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-white/5 border border-primary-100 dark:border-white/10 text-sm"
    >
      <span className="font-semibold text-slate-700 dark:text-slate-200">{count} selected</span>
      {count < matchingCount && (
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs font-semibold text-primary-600 dark:text-accent-400 hover:underline"
        >
          Select all {matchingCount} {filtered ? "matching " : ""}
          {noun}
        </button>
      )}
      <button type="button" onClick={onClear} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline">
        Clear selection
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="ml-auto inline-flex items-center gap-2 px-3.5 h-9 rounded-lg bg-error hover:opacity-90 text-white text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
      >
        <Icon name={actionIcon} className="w-4 h-4" />
        {deleting ? busyLabel : `${actionLabel} (${count})`}
      </button>
    </div>
  );
}

export function confirmBulkDelete(count, singular, plural, consequence = "") {
  const what = `${count} selected ${count === 1 ? singular : plural}`;
  return window.confirm(`Delete ${what}?${consequence ? ` ${consequence}` : ""} This can't be undone.`);
}

// DELETE <url> with { ids } (or another `method`, e.g. POST for bulk cancel);
// resolves with the API's `data` or throws.
export async function requestBulkDelete(url, ids, fallbackError, method = "DELETE") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || fallbackError);
  return json.data;
}
