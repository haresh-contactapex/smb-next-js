import Icon from "@/components/admin-panel/Icon";

const THEME_TEMPLATES = [
  { value: "default", label: "Default collection" },
  { value: "featured", label: "Featured showcase" },
  { value: "grid", label: "Compact grid layout" },
];

export default function HierarchySidebar({
  parentCategory,
  themeTemplate,
  visible,
  categoryOptions,
  onParentChange,
  onThemeChange,
  onVisibleChange,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Category Hierarchy</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Parent Category
          </label>
          <div className="relative">
            <select
              value={parentCategory}
              onChange={(e) => onParentChange(e.target.value)}
              aria-label="Parent category"
              className="field-input appearance-none pr-8 cursor-pointer"
            >
              <option value="none">None (Main Category)</option>
              {categoryOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.parentPath ? `${cat.parentPath} > ${cat.name}` : cat.name}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
              <Icon name="chevron-down" className="w-4 h-4" />
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Select &quot;None&quot; to set this as a top-level primary category.
          </p>
        </div>

        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Theme Template
          </label>
          <div className="relative">
            <select
              value={themeTemplate}
              onChange={(e) => onThemeChange(e.target.value)}
              aria-label="Theme template"
              className="field-input appearance-none pr-8 cursor-pointer"
            >
              {THEME_TEMPLATES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
              <Icon name="chevron-down" className="w-4 h-4" />
            </span>
          </div>
        </div>

        <label className="toggle-row text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={visible} onChange={(e) => onVisibleChange(e.target.checked)} />
          Visible in storefront
        </label>
      </div>
    </section>
  );
}
