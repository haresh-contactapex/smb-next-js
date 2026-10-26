import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getCheckoutSettings, updateCheckoutSettings } from "@/lib/checkoutSettings";
import { isValidMinimumOrderAmount, isValidReminderDelayHours } from "@/lib/shared/settingsCheckout";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("checkout", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getCheckoutSettings();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("checkout", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      allowGuestCheckout: Boolean(payload.allowGuestCheckout),
      requirePhone: Boolean(payload.requirePhone),
      requireTerms: Boolean(payload.requireTerms),
      minimumOrderAmount: String(payload.minimumOrderAmount ?? "").trim(),
      sendAbandonedCartEmails: Boolean(payload.sendAbandonedCartEmails),
      reminderDelayHours: String(payload.reminderDelayHours ?? "").trim(),
    };

    if (!isValidMinimumOrderAmount(settings.minimumOrderAmount)) {
      return fail("Enter a minimum order amount of 0 or more with up to two decimals.", 400);
    }
    if (!isValidReminderDelayHours(settings.reminderDelayHours)) {
      return fail("Enter a whole number of hours, 1 or more, for the reminder delay.", 400);
    }

    const updated = await updateCheckoutSettings({
      ...settings,
      minimumOrderAmount: Number(settings.minimumOrderAmount),
      reminderDelayHours: Number(settings.reminderDelayHours),
    });

    await logAdminActivity({
      actor: auth.user,
      action: "settings.updated",
      entityType: "settings",
      entityId: "checkout",
      title: "Settings updated: checkout",
      description: "changed the checkout settings.",
      severity: "warning",
      metadata: { fields: Object.keys(settings) },
    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
