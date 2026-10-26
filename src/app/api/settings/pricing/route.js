import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getPricingSettings, updatePricingSettings } from "@/lib/pricingSettings";
import { ADJUSTMENT_TYPES, ADJUSTMENT_DIRECTIONS, isValidAdjustmentValue } from "@/lib/shared/settingsPricing";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("pricing", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getPricingSettings();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("pricing", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      adjustmentValue: String(payload.adjustmentValue ?? "").trim(),
      adjustmentType: String(payload.adjustmentType || "percentage").trim(),
      adjustmentDirection: String(payload.adjustmentDirection || "increase").trim(),
    };

    if (!settings.adjustmentValue) {
      return fail("Adjustment value is required.", 400);
    }
    if (!isValidAdjustmentValue(settings.adjustmentValue)) {
      return fail("Enter a number of 0 or more for the adjustment value, with up to 2 decimal places.", 400);
    }
    if (!ADJUSTMENT_TYPES.some((t) => t.value === settings.adjustmentType)) {
      return fail("Select a valid adjustment type.", 400);
    }
    if (!ADJUSTMENT_DIRECTIONS.some((d) => d.value === settings.adjustmentDirection)) {
      return fail("Select a valid adjustment direction.", 400);
    }

    const updated = await updatePricingSettings(settings);

    await logAdminActivity({

      actor: auth.user,

      action: "settings.updated",

      entityType: "settings",

      entityId: "pricing",

      title: "Settings updated: pricing",

      description: `  changed the pricing settings.`,

      severity: "warning",

      metadata: { fields: Object.keys(settings) },

    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
