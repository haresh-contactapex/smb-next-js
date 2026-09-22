export const DEFAULT_SYSTEM_MAINTENANCE_SETTINGS = {
  maintenanceModeEnabled: false,
  maintenanceMessage: "",
  debugModeEnabled: false,
};

export function toFormSettings(data) {
  if (!data) return DEFAULT_SYSTEM_MAINTENANCE_SETTINGS;
  return {
    maintenanceModeEnabled: Boolean(data.maintenanceModeEnabled),
    maintenanceMessage: data.maintenanceMessage || "",
    debugModeEnabled: Boolean(data.debugModeEnabled),
  };
}

export function toSavePayload(settings) {
  return {
    maintenanceModeEnabled: settings.maintenanceModeEnabled,
    maintenanceMessage: settings.maintenanceMessage,
    debugModeEnabled: settings.debugModeEnabled,
  };
}

// Order the "focus the first bad field" behavior follows — top to bottom as
// the fields appear in the form.
export const SYSTEM_MAINTENANCE_FIELD_ORDER = ["maintenanceMessage"];

// Returns { valid, errors: { [field]: message }, firstErrorField, message }.
// `errors[field]` doubles as the red-border/highlight flag for that field.
export function validateSystemMaintenanceSettingsForm(settings) {
  const errors = {};

  if (settings.maintenanceModeEnabled && !settings.maintenanceMessage.trim()) {
    errors.maintenanceMessage = "Enter a maintenance message so storefront visitors see it.";
  }

  const firstErrorField = SYSTEM_MAINTENANCE_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}
