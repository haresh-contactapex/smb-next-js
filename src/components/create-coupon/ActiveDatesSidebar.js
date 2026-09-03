"use client";

import Icon from "@/components/admin-panel/Icon";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "DRAFT", label: "Draft" },
  { value: "EXPIRED", label: "Expired" },
];

export default function ActiveDatesSidebar({
  status,
  startDate,
  endDateEnabled,
  endDate,
  onFieldChange,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Status &amp; Active Dates</h2>

      <div className="relative">
        <select
          aria-label="Coupon status"
          value={status}
          onChange={(e) => onFieldChange("status", e.target.value)}
          className="field-input appearance-none pr-8 cursor-pointer"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
          <Icon name="chevron-down" className="w-4 h-4" />
        </span>
      </div>

      <div className="border-t border-slate-100 dark:border-white/5 mt-4 pt-4 space-y-4">
        <div>
          <label className="field-label" htmlFor="f-start-date">
            Start date
          </label>
          <input
            id="f-start-date"
            type="date"
            aria-label="Start date"
            value={startDate}
            onChange={(e) => onFieldChange("startDate", e.target.value)}
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
            <input
              type="date"
              aria-label="End date"
              value={endDate}
              onChange={(e) => onFieldChange("endDate", e.target.value)}
              className="field-input system-field"
            />
          )}
        </div>
      </div>
    </section>
  );
}
