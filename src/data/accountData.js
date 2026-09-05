export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "India",
  "Germany",
  "France",
  "United Arab Emirates",
];

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

export const TIMEZONES = [
  { value: "UTC-08:00", label: "(UTC-08:00) Pacific Time" },
  { value: "UTC-05:00", label: "(UTC-05:00) Eastern Time" },
  { value: "UTC+00:00", label: "(UTC+00:00) London" },
  { value: "UTC+05:30", label: "(UTC+05:30) India Standard Time" },
];

export const DATE_TIME_FORMATS = [
  { value: "MM/DD/YYYY 12h", label: "MM/DD/YYYY · 12-hour (08/24/2026 2:30 PM)" },
  { value: "DD/MM/YYYY 24h", label: "DD/MM/YYYY · 24-hour (24/08/2026 14:30)" },
  { value: "YYYY-MM-DD 24h", label: "YYYY-MM-DD · 24-hour (2026-08-24 14:30)" },
  { value: "MMM D, YYYY 12h", label: "MMM D, YYYY · 12-hour (Aug 24, 2026 2:30 PM)" },
];

export const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar ($)" },
  { value: "EUR", label: "EUR — Euro (€)" },
  { value: "GBP", label: "GBP — British Pound (£)" },
  { value: "INR", label: "INR — Indian Rupee (₹)" },
  { value: "CAD", label: "CAD — Canadian Dollar (C$)" },
  { value: "AUD", label: "AUD — Australian Dollar (A$)" },
];

export const SAVED_CARDS = [
  {
    id: "card_1",
    brand: "Visa",
    last4: "4242",
    expMonth: "08",
    expYear: "27",
    holder: "Haresh Ambaliya",
    isDefault: true,
  },
  {
    id: "card_2",
    brand: "Mastercard",
    last4: "8210",
    expMonth: "11",
    expYear: "26",
    holder: "Haresh Ambaliya",
    isDefault: false,
  },
];

export const ACCEPTED_CARD_BRANDS = ["Visa", "Mastercard", "American Express", "Discover"];

export const GIFT_CARDS = [
  {
    id: "gc_1",
    code: "GC-8F2K-9XQ2",
    initialValue: 100.0,
    balance: 75.0,
    issuedDate: "2026-01-12",
    expiryDate: "2027-01-12",
    status: "active",
  },
  {
    id: "gc_2",
    code: "GC-3T7L-4RZ9",
    initialValue: 25.0,
    balance: 25.0,
    issuedDate: "2026-07-02",
    expiryDate: "2027-07-02",
    status: "active",
  },
  {
    id: "gc_3",
    code: "GC-1A5M-6VD3",
    initialValue: 50.0,
    balance: 0.0,
    issuedDate: "2025-03-18",
    expiryDate: "2026-03-18",
    status: "redeemed",
  },
];

export const GIFT_CARD_TRANSACTIONS = [
  {
    id: "gct_1",
    date: "2026-08-20",
    description: "Redeemed on order #SMB-10479",
    amount: -25.0,
    cardCode: "GC-8F2K-9XQ2",
  },
  {
    id: "gct_2",
    date: "2026-07-02",
    description: "Gift card GC-3T7L-4RZ9 added to account",
    amount: 25.0,
    cardCode: "GC-3T7L-4RZ9",
  },
  {
    id: "gct_3",
    date: "2026-03-18",
    description: "Redeemed on order #SMB-10312",
    amount: -50.0,
    cardCode: "GC-1A5M-6VD3",
  },
  {
    id: "gct_4",
    date: "2026-01-12",
    description: "Gift card GC-8F2K-9XQ2 added to account",
    amount: 100.0,
    cardCode: "GC-8F2K-9XQ2",
  },
];
