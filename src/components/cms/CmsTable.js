import Link from "next/link";
import Icon from "@/components/admin-panel/Icon";
import { Can } from "@/components/providers/StaffPermissionsProvider";
import { SelectCheckbox, pageSelectionState } from "@/components/admin-panel/BulkSelection";
import { STATUS_BADGE_CLASSES, STATUS_LABELS, footerGroupLabel, formatDateTime, publicPath } from "./helpers";

export default function CmsTable({ pages, onDelete, deletingId, selection, onTogglePage }) {
  // `selection` (from useBulkSelection) is only passed when the viewer may delete.
  const selectable = Boolean(selection);
  const pageState = selectable ? pageSelectionState(selection, pages.map((x) => x.id)) : null;
  if (pages.length === 0) {
    return <div className="py-16 text-center text-sm text-slate-400">No pages match your filters.</div>;
  }

  return (
    <div className="overflow-x-auto custom-scroll -mx-1">
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5">
            {selectable && (
              <th scope="col" className="py-3 pl-3 pr-1 w-[44px]">
                <SelectCheckbox
                  checked={pageState.all}
                  indeterminate={pageState.some}
                  onChange={() => onTogglePage(pages.map((x) => x.id), !pageState.all)}
                  label="Select all pages on this page"
                />
              </th>
            )}
            <th className="py-3 px-1 font-semibold">Page</th>
            <th className="py-3 px-1 font-semibold">Status</th>
            <th className="py-3 px-1 font-semibold">Footer column</th>
            <th className="py-3 px-1 font-semibold">Last updated</th>
            <th className="py-3 px-1 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {pages.map((page) => {
            const isDeleting = page.id === deletingId;
            return (
              <tr
                key={page.id}
                className={`table-row transition-colors${selectable && selection.has(page.id) ? " bg-primary-50/60 dark:bg-white/5" : ""}`}
              >
                {selectable && (
                  <td className="py-3 pl-3 pr-1">
                    <SelectCheckbox
                      checked={selection.has(page.id)}
                      onChange={() => selection.toggle(page.id)}
                      label={`Select ${page.title}`}
                    />
                  </td>
                )}
                <td className="py-3 px-1">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-primary-50 text-primary-600 dark:bg-white/5 dark:text-accent-400">
                      <Icon name="file-text" className="w-5 h-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-700 dark:text-slate-200 truncate">{page.title}</span>
                      <span className="block text-[11px] text-slate-400 system-field">{publicPath(page.slug)}</span>
                    </span>
                  </div>
                </td>
                <td className="py-3 px-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_BADGE_CLASSES[page.status]}`}>
                    {STATUS_LABELS[page.status]}
                  </span>
                </td>
                <td className="py-3 px-1 text-slate-500 dark:text-slate-400">{page.footerGroup ? footerGroupLabel(page.footerGroup) : "—"}</td>
                <td className="py-3 px-1 text-slate-500 dark:text-slate-400">
                  <span className="block">{formatDateTime(page.updatedAt)}</span>
                  {page.updatedByName && <span className="block text-[11px] text-slate-400">by {page.updatedByName}</span>}
                </td>
                <td className="py-3 px-1 text-right">
                  <div className="inline-flex items-center gap-1">
                    {page.status === "published" && (
                      <a
                        href={publicPath(page.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View page on storefront"
                        aria-label={`View ${page.title} on storefront`}
                        className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                      >
                        <Icon name="eye" className="w-4 h-4" />
                      </a>
                    )}
                    <Can permission="content.edit">
                      <Link
                        href={`/admin/cms/${page.id}/edit`}
                        title="Edit page"
                        aria-label={`Edit ${page.title}`}
                        className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                      >
                        <Icon name="edit-2" className="w-4 h-4" />
                      </Link>
                    </Can>
                    <Can permission="content.delete">
                      <button
                        type="button"
                        title="Delete page"
                        aria-label={`Delete ${page.title}`}
                        onClick={() => onDelete?.(page)}
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
