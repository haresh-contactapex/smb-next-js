export const DEFAULT_INTEGRATIONS_SETTINGS = {
  googleAnalyticsEnabled: true,
  googleAnalyticsId: "",
  metaPixelEnabled: false,
  metaPixelId: "",
  mailchimpEnabled: false,
  mailchimpApiKey: "",
  googleRecaptchaEnabled: false,
  googleRecaptchaSiteKey: "",
  googleRecaptchaSecretKey: "",
};

// e.g. G-XXXXXXXXXX
export function isValidGoogleAnalyticsId(value) {
  return /^G-[A-Z0-9]{6,12}$/i.test(value.trim());
}

export function isValidMetaPixelId(value) {
  return /^\d{10,20}$/.test(value.trim());
}

// e.g. {32 hex chars}-us21
export function isValidMailchimpApiKey(value) {
  return /^[a-f0-9]{32}-[a-z]{2,4}\d{1,3}$/i.test(value.trim());
}

export function isValidGoogleRecaptchaSiteKey(value) {
  return /^[A-Za-z0-9_-]{30,40}$/.test(value.trim());
}

export function isValidGoogleRecaptchaSecretKey(value) {
  return /^[A-Za-z0-9_-]{30,40}$/.test(value.trim());
}

export function toFormSettings(data) {
  if (!data) return DEFAULT_INTEGRATIONS_SETTINGS;
  return {
    googleAnalyticsEnabled: Boolean(data.googleAnalyticsEnabled),
    googleAnalyticsId: data.googleAnalyticsId || "",
    metaPixelEnabled: Boolean(data.metaPixelEnabled),
    metaPixelId: data.metaPixelId || "",
    mailchimpEnabled: Boolean(data.mailchimpEnabled),
    mailchimpApiKey: data.mailchimpApiKey || "",
    googleRecaptchaEnabled: Boolean(data.googleRecaptchaEnabled),
    googleRecaptchaSiteKey: data.googleRecaptchaSiteKey || "",
    googleRecaptchaSecretKey: data.googleRecaptchaSecretKey || "",
  };
}

export function toSavePayload(settings) {
  return {
    googleAnalyticsEnabled: settings.googleAnalyticsEnabled,
    googleAnalyticsId: settings.googleAnalyticsId,
    metaPixelEnabled: settings.metaPixelEnabled,
    metaPixelId: settings.metaPixelId,
    mailchimpEnabled: settings.mailchimpEnabled,
    mailchimpApiKey: settings.mailchimpApiKey,
    googleRecaptchaEnabled: settings.googleRecaptchaEnabled,
    googleRecaptchaSiteKey: settings.googleRecaptchaSiteKey,
    googleRecaptchaSecretKey: settings.googleRecaptchaSecretKey,
  };
}

// Each credential field is required only while its integration is enabled,
// but if a value is present at all (enabled or not) it must be well-formed —
// the same "optional but valid if present" rule the Security page's IP
// allowlist follows.
const INTEGRATION_FIELDS = [
  {
    field: "googleAnalyticsId",
    enabledField: "googleAnalyticsEnabled",
    name: "Google Analytics",
    requiredMessage: "Enter your Measurement ID to enable Google Analytics.",
    invalidMessage: "Enter a valid Measurement ID, e.g. G-XXXXXXXXXX.",
    isValid: isValidGoogleAnalyticsId,
  },
  {
    field: "metaPixelId",
    enabledField: "metaPixelEnabled",
    name: "Meta / Facebook Pixel",
    requiredMessage: "Enter your Pixel ID to enable Meta / Facebook Pixel.",
    invalidMessage: "Enter a valid numeric Pixel ID.",
    isValid: isValidMetaPixelId,
  },
  {
    field: "mailchimpApiKey",
    enabledField: "mailchimpEnabled",
    name: "Mailchimp",
    requiredMessage: "Enter your API key to enable Mailchimp.",
    invalidMessage: "Enter a valid Mailchimp API key, e.g. {32 hex chars}-us21.",
    isValid: isValidMailchimpApiKey,
  },
  {
    field: "googleRecaptchaSiteKey",
    enabledField: "googleRecaptchaEnabled",
    name: "Google reCAPTCHA",
    requiredMessage: "Enter your Site Key to enable Google reCAPTCHA.",
    invalidMessage: "Enter a valid reCAPTCHA site key.",
    isValid: isValidGoogleRecaptchaSiteKey,
  },
  {
    field: "googleRecaptchaSecretKey",
    enabledField: "googleRecaptchaEnabled",
    name: "Google reCAPTCHA",
    requiredMessage: "Enter your Secret Key to enable Google reCAPTCHA.",
    invalidMessage: "Enter a valid reCAPTCHA secret key.",
    isValid: isValidGoogleRecaptchaSecretKey,
  },
];

// Order the "focus the first bad field" behavior follows — top to bottom as
// the fields appear in the form.
export const INTEGRATIONS_FIELD_ORDER = INTEGRATION_FIELDS.map((f) => f.field);

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
// `errors[field]` doubles as the red-border/highlight flag for that field.
export function validateIntegrationsSettingsForm(settings) {
  const errors = {};

  for (const { field, enabledField, requiredMessage, invalidMessage, isValid } of INTEGRATION_FIELDS) {
    const value = settings[field] || "";
    if (settings[enabledField] && !value.trim()) {
      errors[field] = requiredMessage;
    } else if (value.trim() && !isValid(value)) {
      errors[field] = invalidMessage;
    }
  }

  const firstErrorField = INTEGRATIONS_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
