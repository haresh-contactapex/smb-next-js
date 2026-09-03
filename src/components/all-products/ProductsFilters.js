import Icon from "@/components/admin-panel/Icon";

const STATUS_OPTIONS = ["All statuses", "Active", "Draft", "Archived"];

export default function ProductsFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  categories,
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
            placeholder="Search by product name or SKU…"
            aria-label="Search products"
            className="field-input h-10 pl-9"
          />
        </div>

        <div className="relative w-full md:w-44 shrink-0">
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter by status"
            className="field-input h-10 appearance-none pr-8 cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt === "All statuses" ? "" : opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
            <Icon name="chevron-down" className="w-4 h-4" />
          </span>
        </div>

        <div className="relative w-full md:w-52 shrink-0">
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Filter by category"
            className="field-input h-10 appearance-none pr-8 cursor-pointer"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
            <Icon name="chevron-down" className="w-4 h-4" />
          </span>
        </div>

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

      <p className="text-xs text-slate-400 mt-3">{resultCount} product{resultCount === 1 ? "" : "s"} found</p>
    </section>
  );
}
