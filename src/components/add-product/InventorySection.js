"use client";

import Icon from "@/components/admin-panel/Icon";
import { toNumber } from "./helpers";

export default function InventorySection({
  trackQuantity,
  sku,
  barcode,
  locations,
  onFieldChange,
  onLocationChange,
}) {
  const total = locations.reduce((sum, l) => sum + toNumber(l.available), 0);

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Inventory</h2>

      <label className="toggle-row text-sm text-slate-700 dark:text-slate-200 mb-4">
        <input
          type="checkbox"
          checked={trackQuantity}
          onChange={(e) => onFieldChange("track_quantity", e.target.checked)}
        />
        Track quantity
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor="f-sku">
            SKU (Stock Keeping Unit)
          </label>
          <input
            id="f-sku"
            type="text"
            placeholder="e.g. BAG-BLK-001"
            aria-label="SKU"
            value={sku}
            onChange={(e) => onFieldChange("sku", e.target.value)}
            className="field-input system-field"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="f-barcode">
            Barcode (ISBN, UPC, GTIN, etc.)
          </label>
          <input
            id="f-barcode"
            type="text"
            placeholder="e.g. 123456789012"
            aria-label="Barcode"
            value={barcode}
            onChange={(e) => onFieldChange("barcode", e.target.value)}
            className="field-input system-field"
          />
        </div>
      </div>

      {trackQuantity && (
        <div className="border-t border-slate-100 dark:border-white/5 mt-4 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Quantity
            </h3>
            <span className="text-xs text-slate-400">{total} available</span>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 bg-slate-50 dark:bg-darksurface2/50 border-b border-slate-200 dark:border-white/10">
                  <th className="py-2 px-3 font-semibold">Location</th>
                  <th className="py-2 px-3 font-semibold w-32">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {locations.map((loc, i) => (
                  <tr key={loc.name}>
                    <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-200">
                      <span className="flex items-center gap-2">
                        <Icon name="map-pin" className="w-3.5 h-3.5 text-slate-400" /> {loc.name}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Available at ${loc.name}`}
                        value={loc.available}
                        onChange={(e) => onLocationChange(i, toNumber(e.target.value))}
                        className="h-9 w-full px-2.5 rounded-lg bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-primary-500/10 system-field text-slate-800 dark:text-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
