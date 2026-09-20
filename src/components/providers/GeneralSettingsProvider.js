"use client";

import { createContext, useContext } from "react";

// Falls back to the store's original defaults if the provider isn't mounted
// (e.g. a component rendered in isolation, such as a test) or the DB row
// hasn't loaded — keeps every consumer safe to call unconditionally.
export const GENERAL_SETTINGS_DEFAULTS = {
  storeName: "Shop My Band",
  logoUrl: null,
  faviconUrl: null,
  currency: "USD",
  skuPrefix: "",
};

const GeneralSettingsContext = createContext(GENERAL_SETTINGS_DEFAULTS);

export function GeneralSettingsProvider({ value, children }) {
  // Only override a default when the caller actually has a value for it —
  // an explicit `undefined` (e.g. settings failed to load) must not stomp
  // the fallback the way a plain object spread would.
  const merged = { ...GENERAL_SETTINGS_DEFAULTS };
  for (const key of Object.keys(GENERAL_SETTINGS_DEFAULTS)) {
    if (value?.[key] != null) merged[key] = value[key];
  }

  return <GeneralSettingsContext.Provider value={merged}>{children}</GeneralSettingsContext.Provider>;
}

// Store name/logo/favicon (Settings -> General), currency (Settings ->
// Currency & Tax) and SKU prefix (Settings -> Products), available to any
// client component without prop-drilling.
export function useGeneralSettings() {
  return useContext(GeneralSettingsContext);
}
