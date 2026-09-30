import Icon from "@/components/admin-panel/Icon";
import { REVIEW_STATUSES, STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/reviewFields";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ModerationSidebar({ status, canApprove, meta, onFieldChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white">Moderation</h2>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_BADGE_CLASSES[status]}`}
        >
          {STATUS_LABELS[status] || status}
        </span>
      </div>

      <label className="field-label" htmlFor="f-status">
        Status
      </label>
      <div className="relative">
        <select
          id="f-status"
          value={status}
          disabled={!canApprove}
          onChange={(e) => onFieldChange("status", e.target.value)}
          aria-describedby="f-status-help"
          className="field-input appearance-none pr-8 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {REVIEW_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
          <Icon name="chevron-down" className="w-4 h-4" />
        </span>
      </div>
      <p id="f-status-help" className="text-[11px] text-slate-400 mt-1.5">
        {canApprove
          ? "Only Approved reviews are shown on the storefront."
          : "You don't have permission to change the status. New reviews are saved as Pending."}
      </p>

      {meta && (
        <dl className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Submitted</dt>
            <dd className="text-slate-600 dark:text-slate-300 text-right">{formatDateTime(meta.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Last updated</dt>
            <dd className="text-slate-600 dark:text-slate-300 text-right">{formatDateTime(meta.updatedAt)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
