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
  timezone: "UTC+05:30",
  dateTimeFormat: "MM/DD/YYYY 12h",
  language: "en",
  currency: "USD",
};

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
