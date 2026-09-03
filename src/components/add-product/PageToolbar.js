export default function PageToolbar({ onLoadSample, onDiscard, onSave }) {
  return (
    <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 bg-slate-50/90 dark:bg-darkbg/90 backdrop-blur-sm border-b border-slate-200/70 dark:border-white/5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <span>Products</span>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-white">Add product</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Add Product</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onLoadSample}
          className="px-4 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          Load sample product
        </button>
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
          Save product
        </button>
      </div>
    </div>
  );
}
