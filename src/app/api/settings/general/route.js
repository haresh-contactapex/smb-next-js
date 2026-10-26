import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getGeneralSettings, updateGeneralSettings } from "@/lib/generalSettings";
import { isValidEmail } from "@/lib/shared/auth";
import { isValidUsPhone } from "@/lib/phone";
import { validateLocationHierarchy } from "@/lib/validateAddress";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("general", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getGeneralSettings();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("general", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      storeName: String(payload.storeName || "").trim(),
      logoUrl: payload.logoUrl ? String(payload.logoUrl).trim() : null,
      faviconUrl: payload.faviconUrl ? String(payload.faviconUrl).trim() : null,
      storeEmail: String(payload.storeEmail || "").trim(),
      phone: String(payload.phone || "").trim(),
      address: String(payload.address || "").trim(),
      country: String(payload.country || "United States").trim(),
      state: String(payload.state || "").trim(),
      city: String(payload.city || "").trim(),
      zip: String(payload.zip || "").trim(),
      timezone: String(payload.timezone || "UTC+05:30").trim(),
      dateTimeFormat: String(payload.dateTimeFormat || "MM/DD/YYYY 12h").trim(),
      language: String(payload.language || "en").trim(),
    };

    if (!settings.storeName) {
      return fail("Store name is required.", 400);
    }
    if (!settings.logoUrl) {
      return fail("A store logo is required.", 400);
    }
    if (!settings.faviconUrl) {
      return fail("A favicon is required.", 400);
    }
    if (!isValidEmail(settings.storeEmail)) {
      return fail("Enter a valid store email address.", 400);
    }
    if (!settings.phone) {
      return fail("Phone number is required.", 400);
    }
    if (!isValidUsPhone(settings.phone)) {
      return fail("Enter a valid 10-digit US phone number.", 400);
    }
    if (!settings.address) {
      return fail("Address is required.", 400);
    }

    const hierarchyResult = validateLocationHierarchy({
      country: settings.country,
      state: settings.state,
      city: settings.city,
      postalCode: settings.zip,
    });
    if (!hierarchyResult.valid) {
      return fail(hierarchyResult.message, 400);
    }

    const updated = await updateGeneralSettings(settings);

    await logAdminActivity({

      actor: auth.user,

      action: "settings.updated",

      entityType: "settings",

      entityId: "general",

      title: "Settings updated: general",

      description: `  changed the general settings.`,

      severity: "warning",

      metadata: { fields: Object.keys(settings) },

    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
