import Icon from "@/components/admin-panel/Icon";
import { SOFT_COLOR_CLASSES } from "@/components/dashboard/colorClasses";
import { VISIBILITY_BADGE_CLASSES } from "./categoryHelpers";

export default function CategoriesTable({ categories }) {
  if (categories.length === 0) {
    return <div className="py-16 text-center text-sm text-slate-400">No categories match your filters.</div>;
  }

  return (
    <div className="overflow-x-auto custom-scroll -mx-1">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
            <th className="py-3 px-1 font-semibold">Category</th>
            <th className="py-3 px-1 font-semibold">Parent</th>
            <th className="py-3 px-1 font-semibold">Products</th>
            <th className="py-3 px-1 font-semibold">Visibility</th>
            <th className="py-3 px-1 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {categories.map((category) => (
            <tr key={category.id} className="table-row transition-colors">
              <td className="py-3 px-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${SOFT_COLOR_CLASSES[category.imageColor]}`}
                  >
                    <Icon name="tag" className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-700 dark:text-slate-200 truncate">
                      {category.name}
                    </span>
                    <span className="block text-[11px] text-slate-400 system-field">/{category.slug}</span>
                  </span>
                </div>
              </td>
              <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{category.parentPath || "—"}</td>
              <td className="py-3 px-1 text-slate-600 dark:text-slate-300">{category.productCount}</td>
              <td className="py-3 px-1">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${VISIBILITY_BADGE_CLASSES[category.visible]}`}
                >
                  {category.visible ? "Visible" : "Hidden"}
                </span>
              </td>
              <td className="py-3 px-1 text-right">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    title="View category"
                    className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <Icon name="eye" className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Edit category"
                    className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <Icon name="edit-2" className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
