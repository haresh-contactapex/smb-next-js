import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getShippingSettings, updateShippingSettings } from "@/lib/shippingSettings";
import {
  CARRIERS,
  WEIGHT_UNITS,
  DIMENSION_UNITS,
  isValidMoneyAmount,
  isValidProcessingTimeDays,
} from "@/lib/shared/settingsShipping";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("shipping", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getShippingSettings();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("shipping", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      defaultCarrier: String(payload.defaultCarrier || "USPS").trim(),
      flatRateFee: String(payload.flatRateFee || "").trim(),
      freeShippingThreshold: String(payload.freeShippingThreshold || "").trim(),
      processingTimeDays: String(payload.processingTimeDays || "").trim(),
      weightUnit: String(payload.weightUnit || "lb").trim(),
      dimensionUnit: String(payload.dimensionUnit || "in").trim(),
      localPickupEnabled: Boolean(payload.localPickupEnabled),
    };

    if (!CARRIERS.includes(settings.defaultCarrier)) {
      return fail("Select a valid default carrier.", 400);
    }
    if (!settings.flatRateFee) {
      return fail("Flat rate shipping fee is required.", 400);
    }
    if (!isValidMoneyAmount(settings.flatRateFee)) {
      return fail("Enter a flat rate shipping fee of 0 or more, with up to 2 decimal places.", 400);
    }
    if (!settings.freeShippingThreshold) {
      return fail("Free shipping threshold is required.", 400);
    }
    if (!isValidMoneyAmount(settings.freeShippingThreshold)) {
      return fail("Enter a free shipping threshold of 0 or more, with up to 2 decimal places.", 400);
    }
    if (!settings.processingTimeDays) {
      return fail("Order processing time is required.", 400);
    }
    if (!isValidProcessingTimeDays(settings.processingTimeDays)) {
      return fail("Enter a whole number of 0 or more for the order processing time.", 400);
    }
    if (!WEIGHT_UNITS.some((u) => u.value === settings.weightUnit)) {
      return fail("Select a valid weight unit.", 400);
    }
    if (!DIMENSION_UNITS.includes(settings.dimensionUnit)) {
      return fail("Select a valid dimension unit.", 400);
    }

    const updated = await updateShippingSettings(settings);

    await logAdminActivity({

      actor: auth.user,

      action: "settings.updated",

      entityType: "settings",

      entityId: "shipping",

      title: "Settings updated: shipping",

      description: `  changed the shipping settings.`,

      severity: "warning",

      metadata: { fields: Object.keys(settings) },

    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
