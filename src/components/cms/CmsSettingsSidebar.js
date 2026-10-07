import Icon from "@/components/admin-panel/Icon";
import { CMS_FOOTER_GROUPS, CMS_FOOTER_LABEL_MAX, CMS_POSITION_MAX, CMS_STATUSES } from "@/lib/cmsRules";
import { formatDateTime, formatSize, publicPath } from "./helpers";

const LABEL = "block text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5";

function SelectBox({ id, value, onChange, disabled, error, children, describedBy }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="field-input appearance-none pr-8 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
        <Icon name="chevron-down" className="w-4 h-4" />
      </span>
    </div>
  );
}

// Publishing, footer placement and, when editing, the page's history.
export default function CmsSettingsSidebar({
  isEdit,
  page,
  status,
  statusError,
  canPublish,
  footerGroup,
  footerGroupError,
  footerLabel,
  footerLabelError,
  position,
  positionError,
  onStatusChange,
  onFooterGroupChange,
  onFooterLabelChange,
  onPositionChange,
  revisions,
  revisionsLoading,
  revisionsError,
  restoringId,
  onOpenRevisions,
  onRestoreRevision,
}) {
  return (
    <>
      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Publishing</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="cms-status" className={LABEL}>
              Status
            </label>
            <SelectBox id="cms-status" value={status} onChange={onStatusChange} disabled={!canPublish} error={statusError} describedBy="cms-status-help">
              {CMS_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectBox>
            <p id="cms-status-help" className={`text-[11px] mt-1.5 ${statusError ? "text-error" : "text-slate-400"}`}>
              {statusError ||
                (canPublish
                  ? "Draft pages are only visible here. Visitors get a not-found page."
                  : "Only staff with the Publish permission can publish or unpublish pages.")}
            </p>
          </div>

          <div>
            <label htmlFor="cms-footer-group" className={LABEL}>
              Footer column
            </label>
            <SelectBox id="cms-footer-group" value={footerGroup} onChange={onFooterGroupChange} error={footerGroupError}>
              <option value="">Not in footer</option>
              {CMS_FOOTER_GROUPS.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </SelectBox>
            <p className="text-[11px] text-slate-400 mt-1.5">Published pages are linked from this column of the storefront footer.</p>
          </div>

          <div>
            <label htmlFor="cms-footer-label" className={LABEL}>
              Footer link text
            </label>
            <input
              id="cms-footer-label"
              type="text"
              value={footerLabel}
              maxLength={CMS_FOOTER_LABEL_MAX}
              onChange={(e) => onFooterLabelChange(e.target.value)}
              placeholder="Defaults to the page title"
              aria-invalid={Boolean(footerLabelError)}
              className="field-input h-10"
            />
            <p className={`text-[11px] mt-1.5 ${footerLabelError ? "text-error" : "text-slate-400"}`}>
              {footerLabelError || "A shorter name for the footer, such as Returns & Shipping."}
            </p>
          </div>

          <div>
            <label htmlFor="cms-position" className={LABEL}>
              Order
            </label>
            <input
              id="cms-position"
              type="number"
              min={0}
              max={CMS_POSITION_MAX}
              step={1}
              value={position}
              onChange={(e) => onPositionChange(e.target.value)}
              placeholder={isEdit ? "0" : "Last"}
              aria-invalid={Boolean(positionError)}
              className="field-input h-10"
            />
            <p className={`text-[11px] mt-1.5 ${positionError ? "text-error" : "text-slate-400"}`}>
              {positionError || "Lower numbers come first in the footer and in this list."}
            </p>
          </div>
        </div>

        {isEdit && page && (
          <dl className="mt-5 space-y-1 border-t border-slate-100 pt-4 text-xs dark:border-white/5">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Last saved</dt>
              <dd className="text-right text-slate-600 dark:text-slate-300">
                {formatDateTime(page.updatedAt)}
                {page.updatedByName && <span className="block text-[11px] text-slate-400">by {page.updatedByName}</span>}
              </dd>
            </div>
            {page.status === "published" && (
              <div className="pt-2">
                <a
                  href={publicPath(page.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-primary-600 hover:underline dark:text-accent-400"
                >
                  <Icon name="eye" className="w-3.5 h-3.5" />
                  View on storefront
                </a>
              </div>
            )}
          </dl>
        )}
      </section>

      {isEdit && (
        <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
          <details onToggle={(e) => e.currentTarget.open && onOpenRevisions()}>
            <summary className="cursor-pointer text-sm font-bold text-slate-800 dark:text-white">Version history</summary>
            <div className="mt-3">
              <p className="text-[11px] text-slate-400 mb-3">
                Each save keeps the version it replaced (the latest 20). Restoring loads that version into the editor; nothing changes until you save.
              </p>
              {revisionsLoading && <p className="text-xs text-slate-400">Loading versions…</p>}
              {revisionsError && (
                <p role="alert" className="text-xs text-error">
                  {revisionsError}
                </p>
              )}
              {revisions && revisions.length === 0 && !revisionsLoading && <p className="text-xs text-slate-400">No earlier versions yet.</p>}
              {revisions && revisions.length > 0 && (
                <ul className="divide-y divide-slate-100 dark:divide-white/5">
                  {revisions.map((revision) => (
                    <li key={revision.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 text-xs">
                        <span className="block truncate font-medium text-slate-700 dark:text-slate-200">{formatDateTime(revision.createdAt)}</span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {revision.savedByName ? `replaced by ${revision.savedByName} · ` : "replaced · "}
                          {formatSize(revision.contentLength)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onRestoreRevision(revision.id)}
                        disabled={restoringId != null}
                        className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                      >
                        {restoringId === revision.id ? "Loading…" : "Restore"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </section>
      )}
    </>
  );
}
