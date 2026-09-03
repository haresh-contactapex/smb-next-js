import Icon from "@/components/admin-panel/Icon";

export default function ProductRulesSidebar() {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <Icon name="tag" className="w-4 h-4 text-slate-400" /> Product Rules
        </span>
        <Icon name="chevron-down" className="w-4 h-4 text-slate-400" />
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          <Icon name="plus-circle" className="w-4 h-4" /> Add condition
        </button>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          <Icon name="refresh-cw" className="w-4 h-4" /> Add products
        </button>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-error/80 hover:bg-error/5 transition-colors"
        >
          <Icon name="x-circle" className="w-4 h-4" /> Exclude
        </button>
      </div>
    </section>
  );
}
