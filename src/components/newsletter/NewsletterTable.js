import Icon from "@/components/admin-panel/Icon";
import { SelectCheckbox, pageSelectionState } from "@/components/admin-panel/BulkSelection";
import { Can } from "@/components/providers/StaffPermissionsProvider";
import { formatDate, sourceLabel } from "./helpers";

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

function DeleteButton({ subscriber, onDelete, deleting, size }) {
  return (
    <Can permission="newsletter.delete">
      <button
        type="button"
        title="Delete subscriber"
        aria-label={`Delete ${subscriber.email}`}
        onClick={() => onDelete?.(subscriber)}
        disabled={deleting}
        className={`${size} grid place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-error dark:hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Icon name="trash-2" className="w-4 h-4" />
      </button>
    </Can>
  );
}

// `selection` is the list's useBulkSelection(), or null when the viewer cannot delete.
export default function NewsletterTable({ subscribers, emptyMessage, selection, onTogglePage, onDelete, deletingId, sort, onSortChange }) {
  if (subscribers.length === 0) {
    return <div className="py-16 text-center text-sm text-slate-400">{emptyMessage}</div>;
  }

  const pageIds = subscribers.map((s) => s.id);
  const pageState = selection ? pageSelectionState(selection, pageIds) : { all: false, some: false };

  return (
    <>
      <div className="md:hidden space-y-3">
        {subscribers.map((subscriber) => {
          const selected = Boolean(selection?.has(subscriber.id));
          return (
            <div
              key={subscriber.id}
              className={`rounded-xl border border-slate-100 dark:border-white/10 p-3 shadow-card ${selected ? "bg-primary-50/60 dark:bg-white/5" : "bg-white dark:bg-darksurface"}`}
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  {selection && (
                    <SelectCheckbox checked={selected} onChange={() => selection.toggle(subscriber.id)} label={`Select ${subscriber.email}`} />
                  )}
                  <span className="break-all text-sm font-medium text-slate-700 dark:text-slate-200 system-field">{subscriber.email}</span>
                </div>
                <DeleteButton subscriber={subscriber} onDelete={onDelete} deleting={subscriber.id === deletingId} size="w-8 h-8" />
              </div>
              <dl className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                {[
                  ["Source", sourceLabel(subscriber.source)],
                  ["Subscribed", formatDate(subscriber.createdAt)],
                ].map(([label, value]) => (
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
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
              {selection && (
                <th className="py-3 pl-3 pr-1 w-[44px]">
                  <SelectCheckbox
                    checked={pageState.all}
                    indeterminate={pageState.some}
                    onChange={() => onTogglePage(pageIds, !pageState.all)}
                    label="Select all subscribers on this page"
                  />
                </th>
              )}
              <SortableHeader label="Email" sortKey="email" sort={sort} onSortChange={onSortChange} />
              <th className="py-3 px-1 font-semibold">Source</th>
              <SortableHeader label="Subscribed" sortKey="createdAt" sort={sort} onSortChange={onSortChange} />
              <th className="py-3 px-1 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {subscribers.map((subscriber) => {
              const selected = Boolean(selection?.has(subscriber.id));
              return (
                <tr key={subscriber.id} className={`table-row transition-colors ${selected ? "bg-primary-50/60 dark:bg-white/5" : ""}`}>
                  {selection && (
                    <td className="py-3 pl-3 pr-1">
                      <SelectCheckbox checked={selected} onChange={() => selection.toggle(subscriber.id)} label={`Select ${subscriber.email}`} />
                    </td>
                  )}
                  <td className="py-3 px-1 font-medium text-slate-700 dark:text-slate-200 system-field">{subscriber.email}</td>
                  <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{sourceLabel(subscriber.source)}</td>
                  <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{formatDate(subscriber.createdAt)}</td>
                  <td className="py-3 px-1 text-right">
                    <DeleteButton subscriber={subscriber} onDelete={onDelete} deleting={subscriber.id === deletingId} size="w-7 h-7" />
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
