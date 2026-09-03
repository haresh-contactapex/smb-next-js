import Icon from "@/components/admin-panel/Icon";

export default function PageToolbar({ onDiscard, onSave }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Icon name="credit-card" className="w-4 h-4" />
          <span>My Account</span>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-white">Payment</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Payment</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onDiscard}
          className="px-4 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onSave}
          className="px-4 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
