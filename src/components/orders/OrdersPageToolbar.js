import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";
import Icon from "@/components/admin-panel/Icon";

export default function OrdersPageToolbar({ title, breadcrumb }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <Breadcrumbs items={[{ label: "Orders", href: "/admin/orders" }, { label: breadcrumb }]} />
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
