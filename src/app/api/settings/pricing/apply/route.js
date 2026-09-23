import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { roleHasPermission, settingsPermission } from "@/lib/permissions";
import { applyPriceAdjustmentToAllProducts } from "@/lib/pricing";
import { ADJUSTMENT_TYPES, ADJUSTMENT_DIRECTIONS, isValidAdjustmentValue } from "@/components/settings-pricing/helpers";

export async function POST(request) {
  // Rewrites every product's price, so it needs product editing rights as
  // well as settings access.
  const auth = await requireStaffPermission(settingsPermission("pricing", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!roleHasPermission(auth.role, "products.edit")) {
    return permissionDeniedResponse({ status: 403, error: "You don't have permission to change product prices." });
  }

  try {
    const payload = await request.json();

    const adjustmentValue = String(payload.adjustmentValue ?? "").trim();
    const adjustmentType = String(payload.adjustmentType || "").trim();
    const adjustmentDirection = String(payload.adjustmentDirection || "").trim();

    if (!adjustmentValue) {
      return NextResponse.json({ success: false, error: "Adjustment value is required." }, { status: 400 });
    }
    if (!isValidAdjustmentValue(adjustmentValue)) {
      return NextResponse.json(
        { success: false, error: "Enter a number of 0 or more for the adjustment value, with up to 2 decimal places." },
        { status: 400 }
      );
    }
    if (!ADJUSTMENT_TYPES.some((t) => t.value === adjustmentType)) {
      return NextResponse.json({ success: false, error: "Select a valid adjustment type." }, { status: 400 });
    }
    if (!ADJUSTMENT_DIRECTIONS.some((d) => d.value === adjustmentDirection)) {
      return NextResponse.json({ success: false, error: "Select a valid adjustment direction." }, { status: 400 });
    }

    const result = await applyPriceAdjustmentToAllProducts({ adjustmentValue, adjustmentType, adjustmentDirection });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
