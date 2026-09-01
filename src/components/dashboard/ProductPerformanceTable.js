import Icon from "@/components/admin-panel/Icon";
import { BADGE_COLOR_CLASSES, SOFT_COLOR_CLASSES } from "./colorClasses";

const STOCK_TEXT_CLASSES = {
  out: "text-error font-medium",
  low: "text-warning font-medium",
  ok: "text-slate-600 dark:text-slate-300",
};

export default function ProductPerformanceTable({ products, viewAllHref = "#" }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Product Performance</h3>
        <a href={viewAllHref} className="text-[13px] font-semibold text-primary-600 dark:text-accent-400 hover:underline">
          View All Products →
        </a>
      </div>
      <div className="overflow-x-auto custom-scroll -mx-1">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
              <th className="py-3 px-1 font-semibold">Product</th>
              <th className="py-3 px-1 font-semibold">Category</th>
              <th className="py-3 px-1 font-semibold">Units Sold</th>
              <th className="py-3 px-1 font-semibold">Revenue</th>
              <th className="py-3 px-1 font-semibold">Stock</th>
              <th className="py-3 px-1 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {products.map((product) => (
              <tr key={product.name} className="table-row transition-colors">
                <td className="py-3 px-1">
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${SOFT_COLOR_CLASSES[product.iconColor]}`}>
                      <Icon name="gift" className="w-5 h-5" />
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{product.name}</span>
                  </div>
                </td>
                <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{product.category}</td>
                <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{product.unitsSold}</td>
                <td className="py-3 px-1 font-semibold text-slate-700 dark:text-slate-200">{product.revenue}</td>
                <td className={`py-3 px-1 ${STOCK_TEXT_CLASSES[product.stockLevel]}`}>{product.stock}</td>
                <td className="py-3 px-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${BADGE_COLOR_CLASSES[product.statusColor]}`}>
                    {product.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
