"use client";

export default function InventorySection({ trackQuantity, sku, barcode, onFieldChange }) {
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
    </section>
  );
}
