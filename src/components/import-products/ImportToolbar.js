import Icon from "@/components/admin-panel/Icon";

export default function ImportToolbar({ onDownloadTemplate, onDownloadVariableTemplate }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <a href="/all-products" className="hover:underline">
            Products
          </a>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-white">Import Products</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Import Products</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          <Icon name="file-text" className="w-4 h-4" />
          Simple product sample
        </button>
        <button
          type="button"
          onClick={onDownloadVariableTemplate}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          <Icon name="file-text" className="w-4 h-4" />
          Variable product sample
        </button>
        <a
          href="/all-products"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors w-fit"
        >
          Back to All Products
        </a>
      </div>
    </div>
  );
}
