"use client";

import Icon from "@/components/admin-panel/Icon";
import { BulkSelectionBar, SelectCheckbox, pageSelectionState } from "@/components/admin-panel/BulkSelection";

// `selection` (from useBulkSelection) is only passed when the viewer may
// delete media; each tile then gets a corner checkbox, separate from the tile
// button that opens the details modal.
export default function MediaGrid({ items, onSelect, deletingId, selection, onBulkDelete, bulkDeleting = false }) {
  if (items.length === 0) {
    return (
      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-8 text-center">
        <Icon name="image" className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No media yet. Uploaded images will appear here for reuse.</p>
      </section>
    );
  }

  const selectable = Boolean(selection);
  const allIds = items.map((item) => item.id);
  const state = selectable ? pageSelectionState(selection, allIds) : null;

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      {selectable && (
        <>
          <BulkSelectionBar
            count={selection.size}
            matchingCount={items.length}
            noun="files"
            onSelectAll={() => selection.replace(allIds)}
            onClear={selection.clear}
            onDelete={onBulkDelete}
            deleting={bulkDeleting}
          />
          {selection.size === 0 && (
            <label className="inline-flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer">
              <SelectCheckbox
                checked={state.all}
                indeterminate={state.some}
                onChange={() => selection.setMany(allIds, !state.all)}
                label={`Select all ${items.length} files`}
              />
              Select all ({items.length})
            </label>
          )}
        </>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((item) => {
          const isDeleting = item.id === deletingId;
          const isSelected = selectable && selection.has(item.id);
          return (
            <div
              key={item.id}
              className={`group relative rounded-xl overflow-hidden aspect-square bg-slate-100 dark:bg-darksurface2/60 border ${
                isSelected
                  ? "border-primary-500 dark:border-accent-500 ring-2 ring-primary-500/30 dark:ring-accent-500/30"
                  : "border-slate-200 dark:border-white/10"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(item)}
                disabled={isDeleting}
                aria-label={`Open ${item.fileName}`}
                className="block w-full h-full disabled:cursor-not-allowed"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- served from public/uploads, arbitrary runtime paths */}
                <img src={item.url} alt={item.altText || item.fileName} className="w-full h-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 text-white text-[10px] px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition">
                  {item.fileName}
                </span>
              </button>
              {selectable && (
                <span
                  className={`absolute top-1.5 left-1.5 grid place-items-center w-6 h-6 rounded-md bg-white/90 dark:bg-darksurface/90 shadow-sm transition-opacity ${
                    isSelected || selection.size > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                  }`}
                >
                  <SelectCheckbox
                    checked={isSelected}
                    onChange={() => selection.toggle(item.id)}
                    label={`Select ${item.fileName}`}
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
