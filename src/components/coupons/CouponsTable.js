import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import {
  formatCouponValue,
  formatDateRange,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  TYPE_ICONS,
} from "./couponHelpers";
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

export default function CouponsTable({ coupons, onDelete, deletingId, sort, onSortChange }) {
  const { currency } = useGeneralSettings();

  if (coupons.length === 0) {
    return <div className="py-16 text-center text-sm text-slate-400">No coupons match your filters.</div>;
  }

  return (
    <div className="overflow-x-auto custom-scroll -mx-1">
      <table className="w-full text-sm min-w-[860px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
            <SortableHeader label="Coupon" sortKey="code" sort={sort} onSortChange={onSortChange} />
            <th className="py-3 px-1 font-semibold">Discount</th>
            <th className="py-3 px-1 font-semibold">Min. Purchase</th>
            <SortableHeader label="Usage" sortKey="usageCount" sort={sort} onSortChange={onSortChange} />
            <SortableHeader label="Validity" sortKey="startDate" sort={sort} onSortChange={onSortChange} />
            <SortableHeader label="Status" sortKey="status" sort={sort} onSortChange={onSortChange} />
            <th className="py-3 px-1 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {coupons.map((coupon) => {
            const isDeleting = coupon.id === deletingId;
            return (
            <tr key={coupon.id} className="table-row transition-colors">
              <td className="py-3 px-1">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-accent-500/10 text-accent-600 dark:text-accent-400">
                    <Icon name={TYPE_ICONS[coupon.type]} className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-700 dark:text-slate-200 truncate system-field">
                      {coupon.code}
                    </span>
                    <span className="block text-[11px] text-slate-400 truncate">{coupon.description}</span>
                  </span>
                </div>
              </td>
              <td className="py-3 px-1 text-slate-600 dark:text-slate-300">{formatCouponValue(coupon, currency)}</td>
              <td className="py-3 px-1 text-slate-500 dark:text-slate-400">
                {coupon.minPurchase ? formatCurrency(coupon.minPurchase, currency) : "—"}
              </td>
              <td className="py-3 px-1 text-slate-500 dark:text-slate-400">
                {coupon.usageCount}
                {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
              </td>
              <td className="py-3 px-1 text-slate-500 dark:text-slate-400">
                {formatDateRange(coupon.startDate, coupon.endDate)}
              </td>
              <td className="py-3 px-1">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_BADGE_CLASSES[coupon.status]}`}
                >
                  {STATUS_LABELS[coupon.status] || coupon.status}
                </span>
              </td>
              <td className="py-3 px-1 text-right">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    title="View coupon"
                    className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <Icon name="eye" className="w-4 h-4" />
                  </button>
                  <Can permission="coupons.edit">
                    <Link
                      href={`/edit-coupon/${coupon.id}`}
                      title="Edit coupon"
                      className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      <Icon name="edit-2" className="w-4 h-4" />
                    </Link>
                  </Can>
                  <Can permission="coupons.delete">
                    <button
                      type="button"
                      title="Delete coupon"
                      onClick={() => onDelete?.(coupon)}
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
