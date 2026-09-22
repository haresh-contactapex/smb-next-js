import { NextResponse } from "next/server";
import { getCurrentStaffUser } from "@/lib/auth/staffSession";
import { getNotificationsSettings, updateNotificationsSettings } from "@/lib/notificationsSettings";
import {
  MIN_TOAST_TIMEOUT_SECONDS,
  MAX_TOAST_TIMEOUT_SECONDS,
  isValidToastTimeoutSeconds,
} from "@/components/settings-notifications/helpers";
import { isValidEmail } from "@/components/auth/helpers";

export async function GET() {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const data = await getNotificationsSettings();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ success: false, error: "Not signed in." }, { status: 401 });
  }

  try {
    const payload = await request.json();

    const settings = {
      newOrderEmailAlert: Boolean(payload.newOrderEmailAlert),
      lowStockAlert: Boolean(payload.lowStockAlert),
      newCustomerSignupAlert: Boolean(payload.newCustomerSignupAlert),
      notificationRecipientEmail: String(payload.notificationRecipientEmail || "").trim(),
      enableSmsNotifications: Boolean(payload.enableSmsNotifications),
      enablePushNotifications: Boolean(payload.enablePushNotifications),
      toastTimeoutSeconds: String(payload.toastTimeoutSeconds || "").trim(),
    };

    if (!settings.notificationRecipientEmail) {
      return NextResponse.json(
        { success: false, error: "Notification recipient email is required." },
        { status: 400 }
      );
    }
    if (!isValidEmail(settings.notificationRecipientEmail)) {
      return NextResponse.json(
        { success: false, error: "Enter a valid notification recipient email address." },
        { status: 400 }
      );
    }
    if (!settings.toastTimeoutSeconds) {
      return NextResponse.json(
        { success: false, error: "Toast notification timeout is required." },
        { status: 400 }
      );
    }
    if (!isValidToastTimeoutSeconds(settings.toastTimeoutSeconds)) {
      return NextResponse.json(
        {
          success: false,
          error: `Enter a whole number between ${MIN_TOAST_TIMEOUT_SECONDS} and ${MAX_TOAST_TIMEOUT_SECONDS} for the toast notification timeout.`,
        },
        { status: 400 }
      );
    }

    const updated = await updateNotificationsSettings(settings);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
