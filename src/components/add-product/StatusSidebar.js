"use client";

import Icon from "@/components/admin-panel/Icon";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
];

export default function StatusSidebar({ status, handle, onFieldChange, onHandleChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Status</h2>
      <div className="relative">
        <select
          aria-label="Product status"
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

      <div className="border-t border-slate-100 dark:border-white/5 mt-4 pt-4">
        <label className="field-label" htmlFor="f-handle">
          Handle
        </label>
        <input
          id="f-handle"
          type="text"
          aria-label="URL handle"
          value={handle}
          onChange={(e) => onHandleChange(e.target.value)}
          className="field-input h-10 system-field"
        />
        <p className="text-[11px] text-slate-400 mt-1.5 truncate">
          yourstore.com/products/<span className="system-field">{handle || "—"}</span>
        </p>
      </div>
    </section>
  );
}
