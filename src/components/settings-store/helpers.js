import { isValidUsPhone } from "@/lib/phone";
import { isValidEmail } from "@/components/auth/helpers";

export const BUSINESS_TYPES = ["Sole Proprietorship", "LLC", "Corporation", "Partnership", "Other"];

export const DEFAULT_STORE_SETTINGS = {
  legalBusinessName: "Shop My Band LLC",
  businessType: "LLC",
  storeUrl: "https://shopmyband.com",
  taxId: "",
  supportEmail: "support@shopmyband.com",
  supportPhone: "",
  supportHours: "Mon–Fri, 9am–6pm EST",
  storeIsLive: true,
};

export function isValidStoreUrl(value) {
  try {
    const url = new URL(value.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export function toFormSettings(data) {
  if (!data) return DEFAULT_STORE_SETTINGS;
  return {
    legalBusinessName: data.legalBusinessName || "",
    businessType: BUSINESS_TYPES.includes(data.businessType) ? data.businessType : "LLC",
    storeUrl: data.storeUrl || "",
    taxId: data.taxId || "",
    supportEmail: data.supportEmail || "",
    supportPhone: data.supportPhone || "",
    supportHours: data.supportHours || "",
    storeIsLive: Boolean(data.storeIsLive),
  };
}

export function toSavePayload(settings) {
  return {
    legalBusinessName: settings.legalBusinessName,
    businessType: settings.businessType,
    storeUrl: settings.storeUrl,
    taxId: settings.taxId,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    supportHours: settings.supportHours,
    storeIsLive: settings.storeIsLive,
  };
}

// Order the "focus the first bad field" behavior follows — top to bottom as
// the fields appear in the form.
export const STORE_SETTINGS_FIELD_ORDER = ["legalBusinessName", "storeUrl", "supportEmail", "supportPhone"];

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
// `errors[field]` doubles as the red-border/highlight flag for that field.
export function validateStoreSettingsForm(settings) {
  const errors = {};

  if (!settings.legalBusinessName.trim()) errors.legalBusinessName = "Enter a legal business name.";
  if (!settings.storeUrl.trim()) {
    errors.storeUrl = "Enter a store URL.";
  } else if (!isValidStoreUrl(settings.storeUrl)) {
    errors.storeUrl = "Enter a valid store URL (e.g. https://yourstore.com).";
  }
  if (!isValidEmail(settings.supportEmail)) errors.supportEmail = "Enter a valid support email address.";
  if (!settings.supportPhone.trim()) {
    errors.supportPhone = "Enter a support phone number.";
  } else if (!isValidUsPhone(settings.supportPhone)) {
    errors.supportPhone = "Enter a valid 10-digit US phone number.";
  }

  const firstErrorField = STORE_SETTINGS_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
