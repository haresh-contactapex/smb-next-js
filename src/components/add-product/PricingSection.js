"use client";

import { toNumber, fmtMoney } from "./helpers";

export default function PricingSection({ price, compareAtPrice, chargeTax, costPerItem, onFieldChange }) {
  const priceNum = toNumber(price);
  const costNum = toNumber(costPerItem);
  const profit = priceNum - costNum;
  const margin = priceNum > 0 ? (profit / priceNum) * 100 : 0;

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Pricing</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor="f-price">
            Price
          </label>
          <div className="prefix-wrap">
            <span className="prefix-sign">$</span>
            <input
              id="f-price"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Price"
              value={price}
              onChange={(e) => onFieldChange("price", e.target.value)}
              className="field-input system-field"
            />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="f-compare">
            Compare-at price
          </label>
          <div className="prefix-wrap">
            <span className="prefix-sign">$</span>
            <input
              id="f-compare"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Compare-at price"
              value={compareAtPrice}
              onChange={(e) => onFieldChange("compare_at_price", e.target.value)}
              className="field-input system-field"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            To show a reduced price, enter a value higher than Price. Shown with a strikethrough.
          </p>
        </div>
      </div>

      <label className="toggle-row text-sm text-slate-700 dark:text-slate-200 mt-4">
        <input
          type="checkbox"
          checked={chargeTax}
          onChange={(e) => onFieldChange("charge_tax", e.target.checked)}
        />
        Charge tax on this product
      </label>

      <div className="border-t border-slate-100 dark:border-white/5 mt-4 pt-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="field-label" htmlFor="f-cost">
              Cost per item
            </label>
            <div className="prefix-wrap">
              <span className="prefix-sign">$</span>
              <input
                id="f-cost"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                aria-label="Cost per item"
                value={costPerItem}
                onChange={(e) => onFieldChange("cost_per_item", e.target.value)}
                className="field-input system-field"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Customers won&apos;t see this</p>
          </div>
          <div>
            <label className="field-label">Profit</label>
            <div
              className={`field-input system-field flex items-center bg-slate-50 dark:bg-darksurface2/60 text-slate-500 dark:text-slate-400${
                profit < 0 ? " text-error" : ""
              }`}
            >
              {fmtMoney(profit)}
            </div>
          </div>
          <div>
            <label className="field-label">Margin</label>
            <div className="field-input system-field flex items-center bg-slate-50 dark:bg-darksurface2/60 text-slate-500 dark:text-slate-400">
              {margin.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
