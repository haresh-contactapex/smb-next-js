"use client";

import Link from "next/link";

// The product's own engraving setting. It decides whether the product page offers engraving:
//   Inherit  follow the engraving categories in Settings -> Engraving (the default)
//   Enabled  always offer engraving on this product, whatever its categories are
//   Disabled never offer it, even when a category of this product has engraving on
// Engraving also needs to be switched on in Settings -> Engraving; if it is off there, nothing here
// shows it. See lib/engravingRules.js (resolveEngravingAvailability).
const OPTIONS = [
  { value: "inherit", label: "Inherit from Category", help: "Offer engraving only if this product is in an engraving-enabled category." },
  { value: "enabled", label: "Enabled", help: "Always offer engraving on this product, whatever its categories are." },
  { value: "disabled", label: "Disabled", help: "Never offer engraving on this product, even if its category has it on." },
];

export default function EngravingSidebar({ mode, onChange }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <fieldset>
        <legend className="text-sm font-bold text-slate-800 dark:text-white mb-3">Engraving</legend>
        <div className="space-y-2.5">
          {OPTIONS.map((option) => (
            <label key={option.value} className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="engraving-mode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => onChange(option.value)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-primary-500 dark:accent-accent-500"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{option.label}</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">{option.help}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-[11px] text-slate-400 mt-3">
        Customers can engrave a short message on products that offer it.{" "}
        <Link
          href="/admin/settings/engraving"
          className="font-medium text-primary-600 dark:text-accent-400 hover:underline"
        >
          Manage engraving categories and fonts
        </Link>
      </p>
    </section>
  );
}
