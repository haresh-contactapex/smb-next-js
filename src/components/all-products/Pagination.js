import Icon from "@/components/admin-panel/Icon";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function getPageNumbers(page, pageCount) {
  const items = [];
  let last = 0;
  for (let i = 1; i <= pageCount; i++) {
    if (i !== 1 && i !== pageCount && (i < page - 1 || i > page + 1)) continue;
    if (last && i - last > 1) items.push("…");
    items.push(i);
    last = i;
  }
  return items;
}

export default function Pagination({ page, pageCount, totalCount, pageSize, onPageChange, onPageSizeChange }) {
  if (totalCount === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const pageNumbers = getPageNumbers(page, pageCount);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-xs text-slate-400">
          Showing <span className="font-medium text-slate-600 dark:text-slate-300">{start}–{end}</span> of{" "}
          <span className="font-medium text-slate-600 dark:text-slate-300">{totalCount}</span> products
        </p>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Rows per page
          <span className="relative">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
              className="field-input h-8 w-[4.25rem] pl-2.5 pr-6 text-xs appearance-none cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none">
              <Icon name="chevron-down" className="w-3.5 h-3.5" />
            </span>
          </span>
        </label>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-3 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Icon name="chevron-left" className="w-3.5 h-3.5" />
          Previous
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((item, index) =>
            item === "…" ? (
              <span key={`ellipsis-${index}`} className="w-8 h-8 grid place-items-center text-xs text-slate-400">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? "page" : undefined}
                className={`w-8 h-8 grid place-items-center rounded-lg text-xs font-semibold transition-colors ${
                  item === page
                    ? "bg-primary-500 dark:bg-accent-500 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-3 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <Icon name="chevron-right" className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
