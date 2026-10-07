import { NextResponse } from "next/server";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { EngravingError, getEngravingAdminConfig, saveEngravingAdminConfig } from "@/lib/engravingSettings";

// Settings -> Engraving. GET returns everything the page edits:
//   { settings, fonts, categoryIds, categories }
// PUT takes { settings, categoryIds, fonts } and saves all three together. The server checks
// every value again with the same rules as the form (src/lib/engravingRules.js).

function failure(error) {
  if (error instanceof EngravingError) {
    return NextResponse.json({ success: false, error: error.message, field: error.field || undefined }, { status: error.status });
  }
  console.error("Engraving settings request failed", error);
  return NextResponse.json({ success: false, error: "Engraving settings could not be saved right now." }, { status: 500 });
}

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("engraving", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    return NextResponse.json({ success: true, data: await getEngravingAdminConfig() });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("engraving", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "That request wasn't valid." }, { status: 400 });
  }

  try {
    const data = await saveEngravingAdminConfig(body);
    await logAdminActivity({
      actor: auth.user,
      action: "settings.updated",
      entityType: "settings",
      entityId: "engraving",
      title: "Settings updated: engraving",
      description: `changed the engraving settings (${data.categoryIds.length} categories, ${data.fonts.length} fonts).`,
      severity: "warning",
      metadata: { engravingEnabled: data.settings.enabled },
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return failure(error);
  }
}
