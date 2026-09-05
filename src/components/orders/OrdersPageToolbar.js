import Icon from "@/components/admin-panel/Icon";

export default function OrdersPageToolbar({ title, breadcrumb }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <span>Orders</span>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-white">{breadcrumb}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">{title}</h1>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-colors shrink-0 w-fit"
      >
        <Icon name="upload-cloud" className="w-4 h-4" />
        Export
      </button>
    </div>
  );
}
