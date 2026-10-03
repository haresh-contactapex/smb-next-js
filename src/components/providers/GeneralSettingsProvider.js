"use client";

import { createContext, useContext, useMemo } from "react";
import { formatCompactCurrency, formatCurrency } from "@/lib/currency";

// Falls back to the store's original defaults if the provider isn't mounted
// (e.g. a component rendered in isolation, such as a test) or the DB row
// hasn't loaded — keeps every consumer safe to call unconditionally.
export const GENERAL_SETTINGS_DEFAULTS = {
  storeName: "Shop My Band",
  logoUrl: null,
  faviconUrl: null,
  currency: "USD",
  currencyPosition: "before",
  numberFormat: "1,234.56",
  skuPrefix: "",
  defaultProductStatus: "draft",
  defaultWeightUnit: "lb",
  enableRecaptcha: false,
  googleRecaptchaEnabled: false,
  googleRecaptchaSiteKey: "",
};

// `formatMoney(amount, currencyCode?)` (and the short `formatCompactMoney`, "$1.2K") is formatCurrency bound to the store's
// currency, symbol position and number format; pass a code to show an amount in
// another currency (e.g. an order placed before the store's currency changed).
function withFormatMoney(settings) {
  const format = { position: settings.currencyPosition, numberFormat: settings.numberFormat };
  return {
    ...settings,
    formatMoney: (amount, currencyCode = settings.currency) => formatCurrency(amount, currencyCode, format),
    formatCompactMoney: (amount, currencyCode = settings.currency) => formatCompactCurrency(amount, currencyCode, format),
  };
}

const GeneralSettingsContext = createContext(withFormatMoney(GENERAL_SETTINGS_DEFAULTS));

export function GeneralSettingsProvider({ value, children }) {
  const merged = useMemo(() => {
    // Only override a default when the caller actually has a value for it —
    // an explicit `undefined` (e.g. settings failed to load) must not stomp
    // the fallback the way a plain object spread would.
    const settings = { ...GENERAL_SETTINGS_DEFAULTS };
    for (const key of Object.keys(GENERAL_SETTINGS_DEFAULTS)) {
      if (value?.[key] != null) settings[key] = value[key];
    }
    return withFormatMoney(settings);
  }, [value]);

  return <GeneralSettingsContext.Provider value={merged}>{children}</GeneralSettingsContext.Provider>;
}

// Store name/logo/favicon (Settings -> General), currency, symbol position
// and number format (Settings -> Currency & Tax; use formatMoney to display
// an amount), SKU prefix/default product status/default weight unit
// (Settings -> Products), whether reCAPTCHA should actually render
// (Security's toggle AND Integrations' toggle — see layout.js), and the
// reCAPTCHA site key (Settings -> Integrations), available to any client
// component without prop-drilling.
export function useGeneralSettings() {
  return useContext(GeneralSettingsContext);
}
