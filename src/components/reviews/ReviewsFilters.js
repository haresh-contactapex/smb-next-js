import Icon from "@/components/admin-panel/Icon";
import { RATING_FILTER_OPTIONS, REVIEW_STATUSES, STATUS_LABELS } from "./reviewHelpers";

function SelectFilter({ value, onChange, label, widthClass, children }) {
  return (
    <div className={`relative w-full ${widthClass} shrink-0`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="field-input h-10 appearance-none pr-8 cursor-pointer"
      >
        {children}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
        <Icon name="chevron-down" className="w-4 h-4" />
      </span>
    </div>
  );
}

export default function ReviewsFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  rating,
  onRatingChange,
  resultCount,
  onClear,
  hasActiveFilters,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-4 sm:p-5">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
            <Icon name="search" className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, review, reviewer, email or product…"
            aria-label="Search reviews"
            className="field-input h-10 pl-9"
          />
        </div>

        <SelectFilter value={status} onChange={onStatusChange} label="Filter by status" widthClass="md:w-44">
          <option value="">All statuses</option>
          {REVIEW_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </SelectFilter>

        <SelectFilter value={rating} onChange={onRatingChange} label="Filter by rating" widthClass="md:w-40">
          <option value="">All ratings</option>
          {RATING_FILTER_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value} star{value === 1 ? "" : "s"}
            </option>
          ))}
        </SelectFilter>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="px-3 h-10 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shrink-0"
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-3">{resultCount} review{resultCount === 1 ? "" : "s"} found</p>
    </section>
  );
}
