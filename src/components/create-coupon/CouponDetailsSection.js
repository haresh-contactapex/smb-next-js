"use client";

import Icon from "@/components/admin-panel/Icon";
import { formatCode, generateCouponCode } from "./helpers";

const TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage", icon: "percent" },
  { value: "fixed", label: "Fixed amount", icon: "dollar-sign" },
  { value: "free_shipping", label: "Free shipping", icon: "truck" },
];

export default function CouponDetailsSection({
  code,
  codeError,
  codeInputRef,
  description,
  type,
  onCodeChange,
  onDescriptionChange,
  onTypeChange,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <div className="space-y-4">
        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Coupon Code
          </label>
          <div className="flex gap-2">
            <input
              ref={codeInputRef}
              type="text"
              value={code}
              onChange={(e) => onCodeChange(formatCode(e.target.value))}
              placeholder="e.g. SUMMER25"
              aria-label="Coupon code"
              className={`field-input h-11 system-field flex-1${codeError ? " border-red-400" : ""}`}
            />
            <button
              type="button"
              onClick={() => onCodeChange(generateCouponCode())}
              className="px-4 h-11 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shrink-0"
            >
              Generate
            </button>
          </div>
          {codeError && <p className="text-xs text-error mt-1">Coupon code is required.</p>}
          <p className="text-[11px] text-slate-400 mt-1.5">Customers enter this code at checkout.</p>
        </div>

        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Internal note about this coupon…"
            aria-label="Coupon description"
            className="w-full p-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm transition-all font-medium text-slate-800 dark:text-white resize-y"
          />
        </div>

        <div>
          <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Discount Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onTypeChange(opt.value)}
                aria-pressed={type === opt.value}
                className={`flex items-center justify-center gap-2 h-11 rounded-xl border text-xs font-semibold transition-colors ${
                  type === opt.value
                    ? "border-primary-500 dark:border-accent-500 bg-primary-500/10 dark:bg-accent-500/10 text-primary-700 dark:text-accent-300"
                    : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                <Icon name={opt.icon} className="w-4 h-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
