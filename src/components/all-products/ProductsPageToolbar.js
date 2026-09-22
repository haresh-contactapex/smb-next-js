import Icon from "@/components/admin-panel/Icon";
import ExportProductsButton from "./ExportProductsButton";

export default function ProductsPageToolbar() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <span>Products</span>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-white">All Products</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">All Products</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <ExportProductsButton />
        <a
          href="/all-products/import"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors w-fit"
        >
          <Icon name="upload-cloud" className="w-4 h-4" />
          Import
        </a>
        <a
          href="/add-product"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-sm font-semibold shadow-sm transition-colors w-fit"
        >
          <Icon name="plus-circle" className="w-4 h-4" />
          Add Product
        </a>
      </div>
    </div>
  );
}
