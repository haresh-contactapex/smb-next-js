"use client";

import Icon from "@/components/admin-panel/Icon";
import { MONTHS, YEARS, formatCardNumber } from "./helpers";

export default function AddCardSection({ card, cardError, onFieldChange, onAddCard }) {
  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-1.5">
        <Icon name="plus-circle" className="w-4 h-4 text-slate-400" /> Add a Card
      </h2>

      <div className="space-y-4">
        <div>
          <label className="field-label" htmlFor="f-card-holder">
            Cardholder Name
          </label>
          <input
            id="f-card-holder"
            type="text"
            value={card.holder}
            onChange={(e) => onFieldChange("holder", e.target.value)}
            placeholder="Name on card"
            aria-label="Cardholder name"
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="f-card-number">
            Card Number
          </label>
          <div className="prefix-wrap">
            <span className="prefix-sign">
              <Icon name="credit-card" className="w-4 h-4" />
            </span>
            <input
              id="f-card-number"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={card.number}
              onChange={(e) => onFieldChange("number", formatCardNumber(e.target.value))}
              placeholder="1234 5678 9012 3456"
              aria-label="Card number"
              className={`field-input${cardError ? " border-red-400" : ""}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="field-label" htmlFor="f-exp-month">
              Month
            </label>
            <div className="relative">
              <select
                id="f-exp-month"
                value={card.expMonth}
                onChange={(e) => onFieldChange("expMonth", e.target.value)}
                aria-label="Expiry month"
                className="field-input appearance-none pr-8 cursor-pointer"
              >
                <option value="">MM</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
                <Icon name="chevron-down" className="w-4 h-4" />
              </span>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="f-exp-year">
              Year
            </label>
            <div className="relative">
              <select
                id="f-exp-year"
                value={card.expYear}
                onChange={(e) => onFieldChange("expYear", e.target.value)}
                aria-label="Expiry year"
                className="field-input appearance-none pr-8 cursor-pointer"
              >
                <option value="">YY</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
                <Icon name="chevron-down" className="w-4 h-4" />
              </span>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="f-cvv">
              CVV
            </label>
            <input
              id="f-cvv"
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={4}
              value={card.cvv}
              onChange={(e) => onFieldChange("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              aria-label="CVV"
              className="field-input"
            />
          </div>
        </div>

        {cardError && <p className="text-xs text-error">Fill in a valid card number, expiry and CVV.</p>}

        <label className="toggle-row text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={card.setDefault}
            onChange={(e) => onFieldChange("setDefault", e.target.checked)}
          />
          Set as default payment method
        </label>

        <button
          type="button"
          onClick={onAddCard}
          className="w-full sm:w-auto px-4 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          Add Card
        </button>
      </div>
    </section>
  );
}
