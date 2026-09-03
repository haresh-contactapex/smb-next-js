"use client";

export default function DiscountValueSection({ type, value, valueError, onValueChange }) {
  if (type === "free_shipping") {
    return (
      <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Discount Value</h2>
        <p className="text-xs text-slate-400">
          This coupon waives shipping charges at checkout — no discount amount is needed.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Discount Value</h2>
      <div className="max-w-xs">
        <label className="field-label" htmlFor="f-value">
          {type === "percentage" ? "Percentage off" : "Amount off"}
        </label>
        {type === "percentage" ? (
          <div className="relative">
            <input
              id="f-value"
              type="text"
              inputMode="decimal"
              placeholder="0"
              aria-label="Percentage off"
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              className={`field-input system-field pr-8${valueError ? " border-red-400" : ""}`}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">%</span>
          </div>
        ) : (
          <div className="prefix-wrap">
            <span className="prefix-sign">₹</span>
            <input
              id="f-value"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Amount off"
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              className={`field-input system-field${valueError ? " border-red-400" : ""}`}
            />
          </div>
        )}
        {valueError && <p className="text-xs text-error mt-1">Enter a discount value.</p>}
      </div>
    </section>
  );
}
