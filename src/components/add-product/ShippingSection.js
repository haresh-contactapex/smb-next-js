"use client";

import Icon from "@/components/admin-panel/Icon";
import { COUNTRY_OPTIONS, WEIGHT_UNITS } from "@/data/addProductData";

export default function ShippingSection({
  physicalProduct,
  weight,
  weightUnit,
  hsCode,
  countryOfOrigin,
  onFieldChange,
}) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Shipping</h2>

      <label className="toggle-row text-sm text-slate-700 dark:text-slate-200 mb-4">
        <input
          type="checkbox"
          checked={physicalProduct}
          onChange={(e) => onFieldChange("physical_product", e.target.checked)}
        />
        This is a physical product
      </label>

      {physicalProduct && (
        <div className="space-y-4">
          <div>
            <label className="field-label" htmlFor="f-weight">
              Weight
            </label>
            <div className="flex gap-2">
              <input
                id="f-weight"
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                aria-label="Weight"
                value={weight}
                onChange={(e) => onFieldChange("weight", e.target.value)}
                className="field-input system-field flex-1"
              />
              <div className="relative w-24 shrink-0">
                <select
                  aria-label="Weight unit"
                  value={weightUnit}
                  onChange={(e) => onFieldChange("weight_unit", e.target.value)}
                  className="field-input system-field appearance-none pr-7 cursor-pointer"
                >
                  {WEIGHT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none">
                  <Icon name="chevron-down" className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-white/5 pt-4">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
              <Icon name="globe" className="w-3.5 h-3.5" /> Customs information
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label" htmlFor="f-hs-code">
                  Harmonized System (HS) code
                </label>
                <input
                  id="f-hs-code"
                  type="text"
                  placeholder="e.g. 7113.19"
                  aria-label="HS code"
                  value={hsCode}
                  onChange={(e) => onFieldChange("hs_code", e.target.value)}
                  className="field-input system-field"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="f-origin">
                  Country/Region of origin
                </label>
                <div className="relative">
                  <select
                    id="f-origin"
                    aria-label="Country or region of origin"
                    value={countryOfOrigin}
                    onChange={(e) => onFieldChange("country_of_origin", e.target.value)}
                    className="field-input appearance-none pr-8 cursor-pointer"
                  >
                    {COUNTRY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
                    <Icon name="chevron-down" className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
