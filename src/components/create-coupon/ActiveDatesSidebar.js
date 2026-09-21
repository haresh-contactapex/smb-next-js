"use client";

import { STATUS_LABELS, STATUS_BADGE_CLASSES } from "@/lib/couponStatus";

export default function ActiveDatesSidebar({
  status,
  startDate,
  endDateEnabled,
  endDate,
  dateRangeError,
  onStartDateChange,
  onEndDateChange,
  onFieldChange,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white">Status &amp; Active Dates</h2>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_BADGE_CLASSES[status]}`}
        >
          {STATUS_LABELS[status] || status}
        </span>
      </div>
      <p className="text-[11px] text-slate-400 -mt-1 mb-3">
        Status is calculated automatically from the dates below.
      </p>

      <div className="space-y-4">
        <div>
          <label className="field-label" htmlFor="f-start-date">
            Start date
          </label>
          <input
            id="f-start-date"
            type="date"
            aria-label="Start date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="field-input system-field"
          />
        </div>

        <div>
          <label className="toggle-row text-sm text-slate-700 dark:text-slate-200 mb-2">
            <input
              type="checkbox"
              checked={endDateEnabled}
              onChange={(e) => onFieldChange("endDateEnabled", e.target.checked)}
            />
            Set an end date
          </label>
          {endDateEnabled && (
            <>
              <input
                type="date"
                aria-label="End date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => onEndDateChange(e.target.value)}
                className={`field-input system-field${dateRangeError ? " border-red-400" : ""}`}
              />
              {dateRangeError && <p className="text-xs text-error mt-1">End date can&apos;t be before the start date.</p>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
