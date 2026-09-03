import Icon from "@/components/admin-panel/Icon";

export default function EligibilitySidebar({ appliesTo, category, categoryOptions, onFieldChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Eligibility</h2>
      <p className="text-xs text-slate-400 mb-3">Choose which products this coupon can be applied to.</p>

      <div className="space-y-4">
        <div className="relative">
          <select
            value={appliesTo}
            onChange={(e) => onFieldChange("appliesTo", e.target.value)}
            aria-label="Applies to"
            className="field-input appearance-none pr-8 cursor-pointer"
          >
            <option value="all">All products</option>
            <option value="category">Specific category</option>
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
            <Icon name="chevron-down" className="w-4 h-4" />
          </span>
        </div>

        {appliesTo === "category" && (
          <div className="relative">
            <select
              value={category}
              onChange={(e) => onFieldChange("category", e.target.value)}
              aria-label="Category"
              className="field-input appearance-none pr-8 cursor-pointer"
            >
              <option value="">Select a category…</option>
              {categoryOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
              <Icon name="chevron-down" className="w-4 h-4" />
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
