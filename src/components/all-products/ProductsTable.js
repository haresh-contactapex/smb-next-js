import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { SOFT_COLOR_CLASSES } from "@/components/dashboard/colorClasses";
import { getStockInfo, STOCK_TEXT_CLASSES, STATUS_BADGE_CLASSES } from "./productHelpers";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { formatCurrency } from "@/lib/currency";
import { Can } from "@/components/providers/StaffPermissionsProvider";

function SortableHeader({ label, sortKey, sort, onSortChange }) {
  const active = sort?.key === sortKey;
  const icon = active ? (sort.direction === "asc" ? "chevron-up" : "chevron-down") : "arrow-up-down";
  return (
    <th className="py-3 px-1 font-semibold">
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        aria-label={`Sort by ${label}${active ? (sort.direction === "asc" ? ", ascending" : ", descending") : ""}`}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        {label}
        <Icon name={icon} className={`w-3 h-3 ${active ? "text-primary-500 dark:text-accent-400" : "text-slate-300 dark:text-slate-600"}`} />
      </button>
    </th>
  );
}

export default function ProductsTable({ products, onDelete, deletingId, sort, onSortChange }) {
  const { currency } = useGeneralSettings();

  if (products.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-slate-400">
        No products match your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto custom-scroll -mx-1">
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
            <SortableHeader label="Product" sortKey="title" sort={sort} onSortChange={onSortChange} />
            <SortableHeader label="Category" sortKey="category" sort={sort} onSortChange={onSortChange} />
            <SortableHeader label="Price" sortKey="price" sort={sort} onSortChange={onSortChange} />
            <th className="py-3 px-1 font-semibold">Inventory</th>
            <SortableHeader label="Status" sortKey="status" sort={sort} onSortChange={onSortChange} />
            <th className="py-3 px-1 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {products.map((product) => {
            const stock = getStockInfo(product.inventory);
            const isDeleting = product.id === deletingId;
            return (
              <tr key={product.id} className="table-row transition-colors">
                <td className="py-3 px-1">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${SOFT_COLOR_CLASSES[product.iconColor]}`}
                    >
                      <Icon name="gift" className="w-5 h-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-700 dark:text-slate-200 truncate">
                        {product.title}
                      </span>
                      <span className="block text-[11px] text-slate-400 system-field">{product.sku}</span>
                    </span>
                  </div>
                </td>
                <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{product.category}</td>
                <td className="py-3 px-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatCurrency(product.price, currency)}
                  </span>
                  {product.compareAtPrice && (
                    <span className="block text-[11px] text-slate-400 line-through">
                      {formatCurrency(product.compareAtPrice, currency)}
                    </span>
                  )}
                </td>
                <td className={`py-3 px-1 ${STOCK_TEXT_CLASSES[stock.level]}`}>{stock.label}</td>
                <td className="py-3 px-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_BADGE_CLASSES[product.status]}`}
                  >
                    {product.status}
                  </span>
                </td>
                <td className="py-3 px-1 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      title="View product"
                      className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      <Icon name="eye" className="w-4 h-4" />
                    </button>
                    <Can permission="products.edit">
                      <Link
                        href={`/edit-product/${product.id}`}
                        title="Edit product"
                        className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                      >
                        <Icon name="edit-2" className="w-4 h-4" />
                      </Link>
                    </Can>
                    <Can permission="products.delete">
                      <button
                        type="button"
                        title="Delete product"
                        onClick={() => onDelete?.(product)}
                        disabled={isDeleting}
                        className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-error dark:hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Icon name="trash-2" className="w-4 h-4" />
                      </button>
                    </Can>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
