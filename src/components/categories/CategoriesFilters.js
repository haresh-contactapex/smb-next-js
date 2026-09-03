import Icon from "@/components/admin-panel/Icon";

export default function CategoriesFilters({ search, onSearchChange, showHiddenOnly, onToggleHidden, resultCount }) {
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
            placeholder="Search categories…"
            aria-label="Search categories"
            className="field-input h-10 pl-9"
          />
        </div>

        <label className="toggle-row text-sm text-slate-600 dark:text-slate-300 shrink-0">
          <input type="checkbox" checked={showHiddenOnly} onChange={(e) => onToggleHidden(e.target.checked)} />
          Hidden only
        </label>
      </div>

      <p className="text-xs text-slate-400 mt-3">
        {resultCount} categor{resultCount === 1 ? "y" : "ies"} found
      </p>
    </section>
  );
}
