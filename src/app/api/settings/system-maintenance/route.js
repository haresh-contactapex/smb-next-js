import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getSystemMaintenanceSettings, updateSystemMaintenanceSettings } from "@/lib/systemMaintenanceSettings";
import { validateSystemMaintenanceSettingsForm } from "@/components/settings-system-maintenance/helpers";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("system-maintenance", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getSystemMaintenanceSettings();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
