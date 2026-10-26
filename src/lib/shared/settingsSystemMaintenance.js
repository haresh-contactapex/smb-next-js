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

export const LAST_BACKUP_STORAGE_KEY = "smb-last-database-backup";

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function backupFileName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `smb-backup-${day}-${pad(date.getHours())}${pad(date.getMinutes())}.sql`;
}

// Whole-number percent from rows copied. Held at 99 until the server says it's
// finished, since the closing constraint/index statements come after the rows.
export function backupPercent(done, total) {
  if (!total) return 0;
  return Math.min(99, Math.floor((done / total) * 100));
}

// Reads the backup response (newline-delimited JSON events) and calls
// onEvent for each one as it arrives.
export async function readBackupStream(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line));
    }
    if (done) break;
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer));
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
