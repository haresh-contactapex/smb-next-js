import Icon from "@/components/admin-panel/Icon";
import { CMS_FOOTER_GROUPS, CMS_STATUSES } from "@/lib/cmsRules";

export default function CmsFilters({ search, onSearchChange, status, onStatusChange, group, onGroupChange, resultCount }) {
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
            placeholder="Search pages by title or URL…"
            aria-label="Search pages"
            className="field-input h-10 pl-9"
          />
        </div>

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter by status"
          className="field-input h-10 md:w-44 cursor-pointer"
        >
          <option value="">All statuses</option>
          {CMS_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={group}
          onChange={(e) => onGroupChange(e.target.value)}
          aria-label="Filter by footer column"
          className="field-input h-10 md:w-52 cursor-pointer"
        >
          <option value="">All footer columns</option>
          {CMS_FOOTER_GROUPS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          <option value="none">Not in footer</option>
        </select>
      </div>

      <p className="text-xs text-slate-400 mt-3" aria-live="polite">
        {resultCount} page{resultCount === 1 ? "" : "s"} found
      </p>
    </section>
  );
}
