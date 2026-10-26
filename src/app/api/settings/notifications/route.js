import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getNotificationsSettings, updateNotificationsSettings } from "@/lib/notificationsSettings";
import {
  MIN_TOAST_TIMEOUT_SECONDS,
  MAX_TOAST_TIMEOUT_SECONDS,
  isValidToastTimeoutSeconds,
} from "@/lib/shared/settingsNotifications";
import { isValidEmail } from "@/lib/shared/auth";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("notifications", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getNotificationsSettings();
    return ok(data);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("notifications", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      lowStockAlert: Boolean(payload.lowStockAlert),
      newCustomerSignupAlert: Boolean(payload.newCustomerSignupAlert),
      notificationRecipientEmail: String(payload.notificationRecipientEmail || "").trim(),
      enableSmsNotifications: Boolean(payload.enableSmsNotifications),
      enablePushNotifications: Boolean(payload.enablePushNotifications),
      toastTimeoutSeconds: String(payload.toastTimeoutSeconds || "").trim(),
    };

    if (!settings.notificationRecipientEmail) {
      return fail("Notification recipient email is required.", 400);
    }
    if (!isValidEmail(settings.notificationRecipientEmail)) {
      return fail("Enter a valid notification recipient email address.", 400);
    }
    if (!settings.toastTimeoutSeconds) {
      return fail("Toast notification timeout is required.", 400);
    }
    if (!isValidToastTimeoutSeconds(settings.toastTimeoutSeconds)) {
      return fail(`Enter a whole number between ${MIN_TOAST_TIMEOUT_SECONDS} and ${MAX_TOAST_TIMEOUT_SECONDS} for the toast notification timeout.`, 400);
    }

    const updated = await updateNotificationsSettings(settings);

    await logAdminActivity({

      actor: auth.user,

      action: "settings.updated",

      entityType: "settings",

      entityId: "notifications",

      title: "Settings updated: notifications",

      description: `  changed the notifications settings.`,

      severity: "warning",

      metadata: { fields: Object.keys(settings) },

    });
    return ok(updated);
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
