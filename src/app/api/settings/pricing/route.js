import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getPricingSettings, updatePricingSettings } from "@/lib/pricingSettings";
import { ADJUSTMENT_TYPES, ADJUSTMENT_DIRECTIONS, isValidAdjustmentValue } from "@/components/settings-pricing/helpers";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("pricing", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getPricingSettings();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("pricing", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();

    const settings = {
      adjustmentValue: String(payload.adjustmentValue ?? "").trim(),
      adjustmentType: String(payload.adjustmentType || "percentage").trim(),
      adjustmentDirection: String(payload.adjustmentDirection || "increase").trim(),
    };

    if (!settings.adjustmentValue) {
      return NextResponse.json({ success: false, error: "Adjustment value is required." }, { status: 400 });
    }
    if (!isValidAdjustmentValue(settings.adjustmentValue)) {
      return NextResponse.json(
        { success: false, error: "Enter a number of 0 or more for the adjustment value, with up to 2 decimal places." },
        { status: 400 }
      );
    }
    if (!ADJUSTMENT_TYPES.some((t) => t.value === settings.adjustmentType)) {
      return NextResponse.json({ success: false, error: "Select a valid adjustment type." }, { status: 400 });
    }
    if (!ADJUSTMENT_DIRECTIONS.some((d) => d.value === settings.adjustmentDirection)) {
      return NextResponse.json({ success: false, error: "Select a valid adjustment direction." }, { status: 400 });
    }

    const updated = await updatePricingSettings(settings);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
