import { sql } from "./db";

// smtp_password is write-only: only whether one is stored leaves the server.
function toPublicSettings(row) {
  return {
    smtpHost: row.smtp_host || "",
    smtpPort: row.smtp_port != null ? String(row.smtp_port) : "",
    smtpUsername: row.smtp_username || "",
    hasSmtpPassword: Boolean(row.smtp_password),
    senderName: row.sender_name || "",
    senderEmail: row.sender_email || "",
    sendOrderConfirmationEmails: row.send_order_confirmation_emails,
    sendShippingNotificationEmails: row.send_shipping_notification_emails,
    sendMarketingEmails: row.send_marketing_emails,
    emailFooterText: row.email_footer_text || "",
  };
}

export async function getEmailSettings() {
  const [row] = await sql`SELECT * FROM email_settings WHERE id = 1`;
  return toPublicSettings(row);
}

export async function hasStoredSmtpPassword() {
  const [row] = await sql`SELECT smtp_password IS NOT NULL AND smtp_password <> '' AS has_password FROM email_settings WHERE id = 1`;
  return Boolean(row?.has_password);
}

// A blank smtpPassword keeps the stored one.
export async function updateEmailSettings(settings) {
  const [row] = await sql`
    UPDATE email_settings SET
      smtp_host = ${settings.smtpHost},
      smtp_port = ${Number(settings.smtpPort)},
      smtp_username = ${settings.smtpUsername},
      smtp_password = COALESCE(${settings.smtpPassword || null}, smtp_password),
      sender_name = ${settings.senderName},
      sender_email = ${settings.senderEmail},
      send_order_confirmation_emails = ${settings.sendOrderConfirmationEmails},
      send_shipping_notification_emails = ${settings.sendShippingNotificationEmails},
      send_marketing_emails = ${settings.sendMarketingEmails},
      email_footer_text = ${settings.emailFooterText || null},
      updated_at = now()
    WHERE id = 1
    RETURNING *
  `;
  return toPublicSettings(row);
}

// Server-only: includes the SMTP password, for the mailer in src/lib/email.js.
// Never return this from an API route.
export async function getEmailTransportSettings() {
  const [row] = await sql`SELECT * FROM email_settings WHERE id = 1`;
  if (!row) return null;
  return { ...toPublicSettings(row), smtpPassword: row.smtp_password || "" };
}
