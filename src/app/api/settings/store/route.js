import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getStoreSettings, updateStoreSettings } from "@/lib/storeSettings";
import { isValidEmail } from "@/lib/shared/auth";
import { isValidUsPhone } from "@/lib/phone";
import { isValidStoreUrl, BUSINESS_TYPES } from "@/lib/shared/settingsStore";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("store", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getStoreSettings();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("store", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      legalBusinessName: String(payload.legalBusinessName || "").trim(),
      businessType: String(payload.businessType || "LLC").trim(),
      storeUrl: String(payload.storeUrl || "").trim(),
      taxId: String(payload.taxId || "").trim(),
      supportEmail: String(payload.supportEmail || "").trim(),
      supportPhone: String(payload.supportPhone || "").trim(),
      supportHours: String(payload.supportHours || "").trim(),
      storeIsLive: Boolean(payload.storeIsLive),
    };

    if (!settings.legalBusinessName) {
      return fail("Legal business name is required.", 400);
    }
    if (!BUSINESS_TYPES.includes(settings.businessType)) {
      return fail("Select a valid business type.", 400);
    }
    if (!settings.storeUrl) {
      return fail("Store URL is required.", 400);
    }
    if (!isValidStoreUrl(settings.storeUrl)) {
      return fail("Enter a valid store URL.", 400);
    }
    if (!isValidEmail(settings.supportEmail)) {
      return fail("Enter a valid support email address.", 400);
    }
    if (!settings.supportPhone) {
      return fail("Support phone number is required.", 400);
    }
    if (!isValidUsPhone(settings.supportPhone)) {
      return fail("Enter a valid 10-digit US phone number.", 400);
    }

    const updated = await updateStoreSettings(settings);

    await logAdminActivity({

      actor: auth.user,

      action: "settings.updated",

      entityType: "settings",

      entityId: "store",

      title: "Settings updated: store",

      description: `  changed the store settings.`,

      severity: "warning",

      metadata: { fields: Object.keys(settings) },

    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
