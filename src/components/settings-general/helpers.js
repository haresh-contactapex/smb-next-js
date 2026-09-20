import { isValidUsPhone } from "@/lib/phone";
import { validateLocationHierarchy } from "@/lib/validateAddress";
import { getCityNames } from "@/data/locationData";

export const DEFAULT_GENERAL_SETTINGS = {
  storeName: "Shop My Band",
  logo: null,
  favicon: null,
  storeEmail: "hello@shopmyband.com",
  phone: "",
  address: "",
  country: "United States",
  state: "",
  city: "",
  zip: "",
  timezone: "UTC+05:30",
  dateTimeFormat: "MM/DD/YYYY 12h",
  language: "en",
  currency: "USD",
};

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function toFormSettings(data) {
  if (!data) return DEFAULT_GENERAL_SETTINGS;
  return {
    storeName: data.storeName || "",
    logo: data.logoUrl ? { url: data.logoUrl, name: data.logoUrl.split("/").pop() } : null,
    favicon: data.faviconUrl ? { url: data.faviconUrl, name: data.faviconUrl.split("/").pop() } : null,
    storeEmail: data.storeEmail || "",
    phone: data.phone || "",
    address: data.address || "",
    country: data.country || "United States",
    state: data.state || "",
    city: data.city || "",
    zip: data.zip || "",
    timezone: data.timezone || "UTC+05:30",
    dateTimeFormat: data.dateTimeFormat || "MM/DD/YYYY 12h",
    language: data.language || "en",
    currency: data.currency || "USD",
  };
}

export function toSavePayload(settings) {
  return {
    storeName: settings.storeName,
    logoUrl: settings.logo?.url || null,
    faviconUrl: settings.favicon?.url || null,
    storeEmail: settings.storeEmail,
    phone: settings.phone,
    address: settings.address,
    country: settings.country,
    state: settings.state,
    city: settings.city,
    zip: settings.zip,
    timezone: settings.timezone,
    dateTimeFormat: settings.dateTimeFormat,
    language: settings.language,
    currency: settings.currency,
  };
}

// Changing country/state must reset the fields that depend on it so the
// form can never hold a state/city that no longer belongs to the selection —
// mirrors updateAddressField() in components/address/helpers.js.
export function updateLocationField(settings, field, value) {
  const next = { ...settings, [field]: value };
  if (field === "country") {
    next.state = "";
    next.city = "";
  } else if (field === "state") {
    const cities = getCityNames(next.country, value);
    next.city = cities.length === 1 ? cities[0] : "";
  }
  return next;
}

// Order the "focus the first bad field" behavior follows — top to bottom as
// the fields appear in the form. Every field here is required.
export const GENERAL_SETTINGS_FIELD_ORDER = [
  "storeName",
  "logo",
  "favicon",
  "storeEmail",
  "phone",
  "address",
  "state",
  "city",
  "zip",
];

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
// `errors[field]` doubles as the red-border flag for that field. City, state,
// zip, and country must all belong to the same location hierarchy (e.g.
// Surat -> Gujarat -> 395004 -> India) — validated the same way as the My
// Account address form, via validateLocationHierarchy().
export function validateGeneralSettingsForm(settings) {
  const errors = {};

  if (!settings.storeName.trim()) errors.storeName = "Enter a store name.";
  if (!settings.logo) errors.logo = "Upload a store logo.";
  if (!settings.favicon) errors.favicon = "Upload a favicon.";
  if (!isValidEmail(settings.storeEmail)) errors.storeEmail = "Enter a valid email address.";
  if (!settings.phone.trim()) {
    errors.phone = "Enter a phone number.";
  } else if (!isValidUsPhone(settings.phone)) {
    errors.phone = "Enter a valid 10-digit US phone number.";
  }
  if (!settings.address.trim()) errors.address = "Enter a street address.";
  if (!settings.state.trim()) errors.state = "Select a state.";
  if (!settings.city.trim()) errors.city = "Select a city.";

  if (!errors.state && !errors.city) {
    const hierarchy = validateLocationHierarchy({
      country: settings.country,
      state: settings.state,
      city: settings.city,
      postalCode: settings.zip,
    });
    if (!hierarchy.valid) {
      errors[hierarchy.field || "zip"] = hierarchy.message;
    }
  }

  const firstErrorField = GENERAL_SETTINGS_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
