import Icon from "@/components/admin-panel/Icon";

export default function NewsletterFilters({ search, onSearchChange, resultCount }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-4 sm:p-5">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
          <Icon name="search" className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by email address…"
          aria-label="Search subscribers"
          className="field-input h-10 pl-9"
        />
      </div>
      <p className="text-xs text-slate-400 mt-3">{resultCount} subscriber{resultCount === 1 ? "" : "s"} found</p>
    </section>
  );
}
