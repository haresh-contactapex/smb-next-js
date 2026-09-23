import Icon from "@/components/admin-panel/Icon";

function FilterSelect({ label, value, onChange, children }) {
  return (
    <div className="relative w-full md:w-48 shrink-0">
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

export default function UsersFilters({
  search,
  onSearchChange,
  role,
  onRoleChange,
  roles,
  status,
  onStatusChange,
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
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search users by name, email or phone…"
            aria-label="Search users"
            className="field-input h-10 pl-9"
          />
        </div>

        <FilterSelect label="Filter by role" value={role} onChange={onRoleChange}>
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Filter by status" value={status} onChange={onStatusChange}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="locked">Locked</option>
        </FilterSelect>

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

      <p className="text-xs text-slate-400 mt-3">
        {resultCount} user{resultCount === 1 ? "" : "s"} found
      </p>
    </section>
  );
}
