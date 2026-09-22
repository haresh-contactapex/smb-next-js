"use client";

import Icon from "@/components/admin-panel/Icon";

export default function AttributesSection({ attributes, onAdd, onChange, onRemove }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white">Attributes</h2>
        <button
          type="button"
          onClick={onAdd}
          className="px-3 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-primary-600 dark:text-accent-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
        >
          <Icon name="plus-circle" className="w-3.5 h-3.5" /> Add Field
        </button>
      </div>

      {attributes.length === 0 ? (
        <p className="text-sm text-slate-400">
          No custom fields yet. Click &quot;Add Field&quot; to create one — e.g. Material, Gemstone, Care
          Instructions.
        </p>
      ) : (
        <div className="space-y-2">
          {attributes.map((attr, i) => (
            <div key={attr.id} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Label (e.g. Material)"
                aria-label={`Field ${i + 1} label`}
                value={attr.label}
                onChange={(e) => onChange(i, "label", e.target.value)}
                className="field-input system-field flex-1"
              />
              <input
                type="text"
                placeholder="Value (e.g. 18K Gold)"
                aria-label={`Field ${i + 1} value`}
                value={attr.value}
                onChange={(e) => onChange(i, "value", e.target.value)}
                className="field-input system-field flex-1"
              />
              <button
                type="button"
                aria-label={`Remove field ${i + 1}`}
                onClick={() => onRemove(i)}
                className="w-9 h-9 shrink-0 grid place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-error dark:hover:bg-red-500/10 transition-colors"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
