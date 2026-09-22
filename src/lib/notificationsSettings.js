import { sql } from "./db";

function toPublicSettings(row) {
  return {
    newOrderEmailAlert: row.new_order_email_alert,
    lowStockAlert: row.low_stock_alert,
    newCustomerSignupAlert: row.new_customer_signup_alert,
    notificationRecipientEmail: row.notification_recipient_email || "",
    enableSmsNotifications: row.enable_sms_notifications,
    enablePushNotifications: row.enable_push_notifications,
    toastTimeoutSeconds: row.toast_timeout_seconds,
  };
}

export async function getNotificationsSettings() {
  const [row] = await sql`SELECT * FROM notifications_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function updateNotificationsSettings(settings) {
  const [row] = await sql`
    UPDATE notifications_settings SET
      new_order_email_alert = ${settings.newOrderEmailAlert},
      low_stock_alert = ${settings.lowStockAlert},
      new_customer_signup_alert = ${settings.newCustomerSignupAlert},
      notification_recipient_email = ${settings.notificationRecipientEmail},
      enable_sms_notifications = ${settings.enableSmsNotifications},
      enable_push_notifications = ${settings.enablePushNotifications},
      toast_timeout_seconds = ${settings.toastTimeoutSeconds},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}
