import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { roleHasPermission, settingsPermission } from "@/lib/permissions";
import { applyPriceAdjustmentToAllProducts } from "@/lib/pricing";
import { ADJUSTMENT_TYPES, ADJUSTMENT_DIRECTIONS, isValidAdjustmentValue } from "@/lib/shared/settingsPricing";

export async function POST(request) {
  // Rewrites every product's price, so it needs product editing rights as
  // well as settings access.
  const auth = await requireStaffPermission(settingsPermission("pricing", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);
  if (!roleHasPermission(auth.role, "products.edit")) {
    return permissionDeniedResponse({ status: 403, error: "You don't have permission to change product prices." });
  }

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const adjustmentValue = String(payload.adjustmentValue ?? "").trim();
    const adjustmentType = String(payload.adjustmentType || "").trim();
    const adjustmentDirection = String(payload.adjustmentDirection || "").trim();

    if (!adjustmentValue) {
      return fail("Adjustment value is required.", 400);
    }
    if (!isValidAdjustmentValue(adjustmentValue)) {
      return fail("Enter a number of 0 or more for the adjustment value, with up to 2 decimal places.", 400);
    }
    if (!ADJUSTMENT_TYPES.some((t) => t.value === adjustmentType)) {
      return fail("Select a valid adjustment type.", 400);
    }
    if (!ADJUSTMENT_DIRECTIONS.some((d) => d.value === adjustmentDirection)) {
      return fail("Select a valid adjustment direction.", 400);
    }

    const result = await applyPriceAdjustmentToAllProducts({ adjustmentValue, adjustmentType, adjustmentDirection });
    return ok(result);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
