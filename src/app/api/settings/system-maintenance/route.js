import { NextResponse } from "next/server";
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
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: publicErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("system-maintenance", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();

    const settings = {
      maintenanceModeEnabled: Boolean(payload.maintenanceModeEnabled),
      maintenanceMessage: String(payload.maintenanceMessage || "").trim(),
      debugModeEnabled: Boolean(payload.debugModeEnabled),
    };

    const result = validateSystemMaintenanceSettingsForm(settings);
    if (!result.valid) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
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
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: publicErrorMessage(error) }, { status: 500 });
  }
}
