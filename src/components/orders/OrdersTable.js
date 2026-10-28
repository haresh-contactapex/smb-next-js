import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { AVATAR_COLOR_CLASSES, BADGE_COLOR_CLASSES } from "@/components/dashboard/colorClasses";
import { SelectCheckbox, pageSelectionState } from "@/components/admin-panel/BulkSelection";
import { BULK_CANCELLABLE_STATUSES } from "./orderHelpers";

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

export default function OrdersTable({ orders, sort, onSortChange, onDownloadInvoice, downloadingId, selection, onTogglePage }) {
  // `selection` (from useBulkSelection) is only passed when the viewer may cancel
  // orders; only Pending and Processing orders can be ticked.
  const selectable = Boolean(selection);
  const cancellableIds = selectable
    ? orders.filter((order) => BULK_CANCELLABLE_STATUSES.includes(order.status)).map((order) => order.orderId)
    : [];
  const pageState = selectable ? pageSelectionState(selection, cancellableIds) : null;

  if (orders.length === 0) {
    return <div className="py-16 text-center text-sm text-slate-400">No orders match your filters.</div>;
  }

  return (
    <>
    <div className="md:hidden space-y-3">
      {orders.map((order) => {
        const cancellable = BULK_CANCELLABLE_STATUSES.includes(order.status);
        const isSelected = selectable && selection.has(order.orderId);
        const rows = [
          ["Customer", <span key="c" className="font-medium text-slate-700 dark:text-slate-200">{order.customer}</span>],
          ["Date", order.date],
          ["Products", order.products],
          ["Amount", <span key="a" className="font-semibold text-slate-700 dark:text-slate-200">{order.amount}</span>],
          [
            "Payment",
            <span key="p" className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${BADGE_COLOR_CLASSES[order.paymentColor]}`}>
              {order.payment}
            </span>,
          ],
          [
            "Status",
            <span key="s" className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${BADGE_COLOR_CLASSES[order.statusColor]}`}>
              {order.status}
            </span>,
          ],
        ];
        return (
          <div
            key={order.id}
            className={`rounded-xl border border-slate-100 dark:border-white/10 p-3 shadow-card ${isSelected ? "bg-primary-50/60 dark:bg-white/5" : "bg-white dark:bg-darksurface"}`}
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                {selectable && (
                  <SelectCheckbox
                    checked={isSelected}
                    disabled={!cancellable}
                    title={cancellable ? undefined : `${order.status} orders can't be cancelled from the list`}
                    onChange={() => selection.toggle(order.orderId)}
                    label={cancellable ? `Select order ${order.id}` : `Order ${order.id} can't be selected: it's ${order.status.toLowerCase()}`}
                  />
                )}
                <span
                  className={`w-8 h-8 rounded-full text-[11px] font-bold grid place-items-center shrink-0 ${AVATAR_COLOR_CLASSES[order.avatarColor]}`}
                >
                  {order.initials}
                </span>
                <span className="font-semibold text-primary-700 dark:text-accent-400 text-sm truncate">{order.id}</span>
              </div>
              <div className="inline-flex items-center gap-1">
                <Link
                  href={`/admin/orders/${order.orderId}`}
                  title="View order"
                  aria-label={`View order ${order.id}`}
                  className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  <Icon name="eye" className="w-4 h-4" />
                </Link>
                <Link
                  href={`/admin/edit-order/${order.orderId}`}
                  title="Edit order"
                  className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  <Icon name="edit-2" className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  title="Download invoice"
                  aria-label={`Download invoice for ${order.id}`}
                  disabled={downloadingId != null}
                  onClick={() => onDownloadInvoice(order)}
                  className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <Icon
                    name={downloadingId === order.orderId ? "refresh-cw" : "download"}
                    className={`w-4 h-4 ${downloadingId === order.orderId ? "animate-spin motion-reduce:animate-none" : ""}`}
                  />
                </button>
              </div>
            </div>
            <dl className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-2">
                  <dt className="text-slate-400 shrink-0">{label}</dt>
                  <dd className="text-right text-slate-500 dark:text-slate-400 min-w-0">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
    <div className="hidden md:block overflow-x-auto custom-scroll -mx-1">
      <table className="w-full text-sm min-w-[860px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
            {selectable && (
              <th scope="col" className="py-3 pl-3 pr-1 w-[44px]">
                <SelectCheckbox
                  checked={pageState.all}
                  indeterminate={pageState.some}
                  disabled={cancellableIds.length === 0}
                  onChange={() => onTogglePage(cancellableIds, !pageState.all)}
                  label="Select all cancellable orders on this page"
                />
              </th>
            )}
            <SortableHeader label="Order ID" sortKey="id" sort={sort} onSortChange={onSortChange} />
            <SortableHeader label="Customer" sortKey="customer" sort={sort} onSortChange={onSortChange} />
            <SortableHeader label="Date" sortKey="date" sort={sort} onSortChange={onSortChange} />
            <th className="py-3 px-1 font-semibold">Products</th>
            <SortableHeader label="Amount" sortKey="amount" sort={sort} onSortChange={onSortChange} />
            <SortableHeader label="Payment" sortKey="payment" sort={sort} onSortChange={onSortChange} />
            <SortableHeader label="Status" sortKey="status" sort={sort} onSortChange={onSortChange} />
            <th className="py-3 px-1 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {orders.map((order) => {
            const cancellable = BULK_CANCELLABLE_STATUSES.includes(order.status);
            const isSelected = selectable && selection.has(order.orderId);
            return (
            <tr
              key={order.id}
              className={`table-row transition-colors${isSelected ? " bg-primary-50/60 dark:bg-white/5" : ""}`}
            >
              {selectable && (
                <td className="py-3 pl-3 pr-1">
                  <SelectCheckbox
                    checked={isSelected}
                    disabled={!cancellable}
                    title={cancellable ? undefined : `${order.status} orders can't be cancelled from the list`}
                    onChange={() => selection.toggle(order.orderId)}
                    label={cancellable ? `Select order ${order.id}` : `Order ${order.id} can't be selected: it's ${order.status.toLowerCase()}`}
                  />
                </td>
              )}
              <td className="py-3 px-1 font-semibold text-primary-700 dark:text-accent-400">{order.id}</td>
              <td className="py-3 px-1">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-7 h-7 rounded-full text-[11px] font-bold grid place-items-center shrink-0 ${AVATAR_COLOR_CLASSES[order.avatarColor]}`}
                  >
                    {order.initials}
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{order.customer}</span>
                </div>
              </td>
              <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{order.date}</td>
              <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{order.products}</td>
              <td className="py-3 px-1 font-semibold text-slate-700 dark:text-slate-200">{order.amount}</td>
              <td className="py-3 px-1">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${BADGE_COLOR_CLASSES[order.paymentColor]}`}>
                  {order.payment}
                </span>
              </td>
              <td className="py-3 px-1">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${BADGE_COLOR_CLASSES[order.statusColor]}`}>
                  {order.status}
                </span>
              </td>
              <td className="py-3 px-1 text-right">
                <div className="inline-flex items-center gap-1">
                  <Link
                    href={`/admin/orders/${order.orderId}`}
                    title="View order"
                    aria-label={`View order ${order.id}`}
                    className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <Icon name="eye" className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/admin/edit-order/${order.orderId}`}
                    title="Edit order"
                    className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <Icon name="edit-2" className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    title="Download invoice"
                    aria-label={`Download invoice for ${order.id}`}
                    disabled={downloadingId != null}
                    onClick={() => onDownloadInvoice(order)}
                    className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <Icon
                      name={downloadingId === order.orderId ? "refresh-cw" : "download"}
                      className={`w-4 h-4 ${downloadingId === order.orderId ? "animate-spin motion-reduce:animate-none" : ""}`}
                    />
                  </button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
