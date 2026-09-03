"use client";

export default function UsageLimitsSection({
  minPurchase,
  usageLimitEnabled,
  usageLimit,
  onePerCustomer,
  onFieldChange,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Minimum Purchase &amp; Usage Limits</h2>

      <div className="max-w-xs mb-4">
        <label className="field-label" htmlFor="f-min-purchase">
          Minimum purchase amount
        </label>
        <div className="prefix-wrap">
          <span className="prefix-sign">₹</span>
          <input
            id="f-min-purchase"
            type="text"
            inputMode="decimal"
            placeholder="No minimum"
            aria-label="Minimum purchase amount"
            value={minPurchase}
            onChange={(e) => onFieldChange("minPurchase", e.target.value)}
            className="field-input system-field"
          />
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
        <label className="toggle-row text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={usageLimitEnabled}
            onChange={(e) => onFieldChange("usageLimitEnabled", e.target.checked)}
          />
          Limit number of times this coupon can be used in total
        </label>
        {usageLimitEnabled && (
          <input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 200"
            aria-label="Total usage limit"
            value={usageLimit}
            onChange={(e) => onFieldChange("usageLimit", e.target.value)}
            className="field-input system-field h-10 max-w-[10rem] ml-6 w-auto"
          />
        )}

        <label className="toggle-row text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={onePerCustomer}
            onChange={(e) => onFieldChange("onePerCustomer", e.target.checked)}
          />
          Limit to one use per customer
        </label>
      </div>
    </section>
  );
}
