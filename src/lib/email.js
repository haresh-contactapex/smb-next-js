import nodemailer from "nodemailer";
import { getEmailTransportSettings } from "./emailSettings";

// SMTP details come from Settings -> Email (the email_settings table) once
// they have been saved there; until then the SMTP_* env vars in .env.local
// (see .env.example) are used as a fallback, so a fresh environment — or one
// where the email_settings table hasn't been migrated yet — can still send.
// Settings are re-read on every send, so changes saved on the Settings ->
// Email page apply to the whole system immediately, without a restart.
let cachedTransporter = null;
let cachedTransporterKey = null;

function readEnvSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const from = process.env.SMTP_FROM || user;

  return { source: "env", host, port, user, pass, secure, from, footerText: "" };
}

function isCompleteConfig(config) {
  return Boolean(config?.host && config.user && config.pass);
}

// Returns null when email_settings is missing (not migrated) or unreadable,
// so callers fall back to the env config instead of failing.
async function readSettingsSmtpConfig() {
  try {
    const settings = await getEmailTransportSettings();
    if (!settings) return null;
    const port = Number(settings.smtpPort || 587);
    return {
      source: "settings",
      host: settings.smtpHost,
      port,
      user: settings.smtpUsername,
      pass: settings.smtpPassword,
      secure: port === 465,
      from: settings.senderEmail
        ? { name: settings.senderName || "", address: settings.senderEmail }
        : settings.smtpUsername,
      footerText: settings.emailFooterText || "",
    };
  } catch (error) {
    console.error("email: could not read Settings -> Email, falling back to SMTP_* env vars.", error.message);
    return null;
  }
}

async function readSmtpConfig() {
  const settingsConfig = await readSettingsSmtpConfig();
  if (isCompleteConfig(settingsConfig)) return settingsConfig;

  const envConfig = readEnvSmtpConfig();
  // The footer is a store setting in its own right, so it still applies
  // while the SMTP connection itself comes from the env fallback.
  return { ...envConfig, footerText: settingsConfig?.footerText || "" };
}

// "settings" (Settings -> Email), "env" (.env.local fallback) or "none".
export async function getActiveSmtpSource() {
  const config = await readSmtpConfig();
  return isCompleteConfig(config) ? config.source : "none";
}

export async function isEmailConfigured() {
  return isCompleteConfig(await readSmtpConfig());
}

function getTransporter(config) {
  const key = JSON.stringify([config.host, config.port, config.secure, config.user, config.pass]);

  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter;
  }

  cachedTransporter?.close?.();
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  cachedTransporterKey = key;
  return cachedTransporter;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function withFooter({ html, text }, footerText) {
  if (!footerText) return { html, text };
  const footerHtml = escapeHtml(footerText).replace(/\r?\n/g, "<br/>");
  return {
    html: html ? `${html}\n<hr/>\n<p style="color:#64748b;font-size:12px">${footerHtml}</p>` : html,
    text: text ? `${text}\n\n--\n${footerText}` : text,
  };
}

// Sends best-effort: returns false and logs instead of throwing, so callers
// (e.g. forgot-password) don't have to branch their response on email
// delivery and risk leaking account-existence info through status codes.
export async function sendEmail({ to, subject, html, text }) {
  const config = await readSmtpConfig();
  if (!isCompleteConfig(config)) {
    console.error("sendEmail: SMTP is not configured in Settings -> Email or SMTP_* env vars — email not sent.");
    return false;
  }

  try {
    const body = withFooter({ html, text }, config.footerText);
    await getTransporter(config).sendMail({ from: config.from, to, subject, ...body });
    return true;
  } catch (error) {
    console.error("sendEmail: failed to send", error);
    return false;
  }
}

export async function sendPasswordResetEmail({ to, resetLink }) {
  const subject = "Reset your password";
  const text = `We received a request to reset your password. Use the link below to choose a new one. This link expires in 1 hour and can only be used once.\n\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.`;
  const html = `
    <p>We received a request to reset your password.</p>
    <p><a href="${resetLink}">Click here to choose a new password</a></p>
    <p>This link expires in 1 hour and can only be used once.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `;

  return sendEmail({ to, subject, html, text });
}

export async function sendCustomerWelcomeEmail({ to, firstName, storeName }) {
  const subject = `Welcome to ${storeName}`;
  const text = `Hi ${firstName},\n\nYour ${storeName} account has been created. You can now sign in to check out faster and track your orders.\n\nIf you didn't create this account, please contact us.`;
  const html = `
    <p>Hi ${firstName},</p>
    <p>Your ${storeName} account has been created. You can now sign in to check out faster and track your orders.</p>
    <p>If you didn't create this account, please contact us.</p>
  `;

  return sendEmail({ to, subject, html, text });
}

// Notifies the store's contact address (Settings -> General -> Store Email)
// of a new signup — a lightweight "someone joined" notice, not a
// transactional email the customer is waiting on, so a delivery failure here
// is logged (by sendEmail) but never surfaces to the registering customer.
export async function sendNewCustomerAdminNotification({ to, customer, storeName }) {
  const subject = `New customer registered on ${storeName}`;
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();
  const text = `A new customer just registered on ${storeName}.\n\nName: ${fullName}\nEmail: ${customer.email}`;
  const html = `
    <p>A new customer just registered on ${storeName}.</p>
    <p><strong>Name:</strong> ${fullName}<br/><strong>Email:</strong> ${customer.email}</p>
  `;

  return sendEmail({ to, subject, html, text });
}

// Sent when an admin creates a staff account on Users -> Add User. The
// account starts with a random password; the link lets the new user replace
// it (it reuses the staff reset-password flow).
export async function sendStaffWelcomeEmail({ to, firstName, storeName, temporaryPassword, setPasswordLink, loginLink, linkExpiresInHours }) {
  const subject = `Your ${storeName} admin account has been created`;
  const text = `Hi ${firstName},\n\nAn admin account has been created for you on ${storeName}.\n\nSign in: ${loginLink}\nEmail: ${to}\nTemporary password: ${temporaryPassword}\n\nFor your security, set your own password using this link (it expires in ${linkExpiresInHours} hours and can only be used once):\n${setPasswordLink}\n\nIf you weren't expecting this, please contact your store administrator.`;
  const html = `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>An admin account has been created for you on <strong>${escapeHtml(storeName)}</strong>.</p>
    <p>
      <strong>Email:</strong> ${escapeHtml(to)}<br/>
      <strong>Temporary password:</strong> <code style="font-size:15px">${escapeHtml(temporaryPassword)}</code>
    </p>
    <p><a href="${setPasswordLink}">Set your own password</a> &nbsp;·&nbsp; <a href="${loginLink}">Sign in</a></p>
    <p>For your security, set your own password now. The link expires in ${linkExpiresInHours} hours and can only be used once.</p>
    <p>If you weren't expecting this, please contact your store administrator.</p>
  `;

  return sendEmail({ to, subject, html, text });
}
