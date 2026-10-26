import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getSystemMaintenanceSettings, updateSystemMaintenanceSettings } from "@/lib/systemMaintenanceSettings";
import { validateSystemMaintenanceSettingsForm } from "@/lib/shared/settingsSystemMaintenance";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("system-maintenance", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getSystemMaintenanceSettings();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("system-maintenance", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      maintenanceModeEnabled: Boolean(payload.maintenanceModeEnabled),
      maintenanceMessage: String(payload.maintenanceMessage || "").trim(),
      debugModeEnabled: Boolean(payload.debugModeEnabled),
    };

    const result = validateSystemMaintenanceSettingsForm(settings);
    if (!result.valid) {
      return fail(result.message, 400);
    }

    const updated = await updateSystemMaintenanceSettings(settings);

    await logAdminActivity({

      actor: auth.user,

      action: "settings.updated",

      entityType: "settings",

      entityId: "system-maintenance",

      title: "Settings updated: system-maintenance",

      description: `  changed the system-maintenance settings.`,

      severity: "warning",

      metadata: { fields: Object.keys(settings) },

    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
