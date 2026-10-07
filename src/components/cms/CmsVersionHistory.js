"use client";

import { formatDateTime, formatSize } from "./helpers";

// The "Version history" card of the CMS page and Blog post editors: a disclosure that
// lists the earlier versions of the item being edited. `onOpen` is called when it is
// expanded (the editor loads the list then) and `onRestore(revisionId)` when a version is
// chosen. `noun` only words the restore button's tooltip ("page" or "post").
export default function CmsVersionHistory({
  revisions,
  revisionsLoading,
  revisionsError,
  restoringId,
  onOpen,
  onRestore,
  noun = "page",
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <details onToggle={(e) => e.currentTarget.open && onOpen()}>
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
                    onClick={() => onRestore(revision.id)}
                    disabled={restoringId != null}
                    title={`Load this earlier version of the ${noun} into the editor`}
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
  );
}
