import { fail, ok, readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { logAdminActivity } from "@/lib/notifications";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getEmailSettings, hasStoredSmtpPassword, updateEmailSettings } from "@/lib/emailSettings";
import { getActiveSmtpSource } from "@/lib/email";
import { EMAIL_FIELD_ORDER, getEmailSettingsErrors } from "@/lib/shared/settingsEmail";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("email", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getEmailSettings();
    return ok({ ...data, activeSmtpSource: await getActiveSmtpSource() });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("email", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const body = await readJsonBody(request);
    if (body.response) return body.response;
    const payload = body.payload;

    const settings = {
      smtpHost: String(payload.smtpHost || "").trim(),
      smtpPort: String(payload.smtpPort ?? "").trim(),
      smtpUsername: String(payload.smtpUsername || "").trim(),
      // Not trimmed: spaces can be part of a password.
      smtpPassword: String(payload.smtpPassword || ""),
      senderName: String(payload.senderName || "").trim(),
      senderEmail: String(payload.senderEmail || "").trim(),
      sendOrderConfirmationEmails: Boolean(payload.sendOrderConfirmationEmails),
      sendShippingNotificationEmails: Boolean(payload.sendShippingNotificationEmails),
      sendNewOrderEmails: Boolean(payload.sendNewOrderEmails),
      sendProcessingOrderEmails: Boolean(payload.sendProcessingOrderEmails),
      sendCancelledOrderEmails: Boolean(payload.sendCancelledOrderEmails),
      sendFailedOrderEmails: Boolean(payload.sendFailedOrderEmails),
      sendMarketingEmails: Boolean(payload.sendMarketingEmails),
      emailFooterText: String(payload.emailFooterText || "").trim(),
    };

    const hasSmtpPassword = settings.smtpPassword ? true : await hasStoredSmtpPassword();
    const errors = getEmailSettingsErrors(settings, { hasSmtpPassword });
    const firstErrorField = EMAIL_FIELD_ORDER.find((field) => errors[field]);
    if (firstErrorField) {
      return fail(errors[firstErrorField], 400);
    }

    const updated = await updateEmailSettings(settings);

    await logAdminActivity({

      actor: auth.user,

      action: "settings.updated",

      entityType: "settings",

      entityId: "email",

      title: "Settings updated: email",

      description: `  changed the email settings.`,

      severity: "warning",

      metadata: { fields: Object.keys(settings) },

    });
    return ok({ ...updated, activeSmtpSource: await getActiveSmtpSource() });
  } catch (error) {
    return fail(publicErrorMessage(error), 500);
  }
}
