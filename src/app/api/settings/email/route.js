import { NextResponse } from "next/server";
import { requireStaffPermission, permissionDeniedResponse } from "@/lib/auth/staffPermissions";
import { settingsPermission } from "@/lib/permissions";
import { getEmailSettings, hasStoredSmtpPassword, updateEmailSettings } from "@/lib/emailSettings";
import { getActiveSmtpSource } from "@/lib/email";
import { EMAIL_FIELD_ORDER, getEmailSettingsErrors } from "@/components/settings-email/helpers";

export async function GET() {
  const auth = await requireStaffPermission(settingsPermission("email", "view"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const data = await getEmailSettings();
    return NextResponse.json({ success: true, data: { ...data, activeSmtpSource: await getActiveSmtpSource() } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = await requireStaffPermission(settingsPermission("email", "edit"));
  if (!auth.ok) return permissionDeniedResponse(auth);

  try {
    const payload = await request.json();

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
      sendMarketingEmails: Boolean(payload.sendMarketingEmails),
      emailFooterText: String(payload.emailFooterText || "").trim(),
    };

    const hasSmtpPassword = settings.smtpPassword ? true : await hasStoredSmtpPassword();
    const errors = getEmailSettingsErrors(settings, { hasSmtpPassword });
    const firstErrorField = EMAIL_FIELD_ORDER.find((field) => errors[field]);
    if (firstErrorField) {
      return NextResponse.json({ success: false, error: errors[firstErrorField] }, { status: 400 });
    }

    const updated = await updateEmailSettings(settings);
    return NextResponse.json({
      success: true,
      data: { ...updated, activeSmtpSource: await getActiveSmtpSource() },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
