export default function Pagination({ page, pageCount, totalCount, pageSize, onPageChange }) {
  if (totalCount === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
      <p className="text-xs text-slate-400">
        Showing <span className="font-medium text-slate-600 dark:text-slate-300">{start}–{end}</span> of{" "}
        <span className="font-medium text-slate-600 dark:text-slate-300">{totalCount}</span> orders
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <span className="text-xs text-slate-400 px-1">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="px-3 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
