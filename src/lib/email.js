import nodemailer from "nodemailer";

// SMTP is configured via env vars (see .env.example), the same pattern used
// for JWT_SECRET/RECAPTCHA_SECRET_KEY. The DB-backed email_settings table in
// docs/settings/settings-database-schema.md is not migrated yet, and its
// smtp_password column needs encryption-at-rest before it can hold real
// credentials — so this reads process.env directly rather than that table.
let cachedTransporter = null;
let cachedTransporterKey = null;

function readSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const from = process.env.SMTP_FROM || user;

  return { host, port, user, pass, secure, from };
}

export function isEmailConfigured() {
  const { host, user, pass } = readSmtpConfig();
  return Boolean(host && user && pass);
}

function getTransporter() {
  const config = readSmtpConfig();
  const key = `${config.host}:${config.port}:${config.user}`;

  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  cachedTransporterKey = key;
  return cachedTransporter;
}

// Sends best-effort: returns false and logs instead of throwing, so callers
// (e.g. forgot-password) don't have to branch their response on email
// delivery and risk leaking account-existence info through status codes.
export async function sendEmail({ to, subject, html, text }) {
  if (!isEmailConfigured()) {
    console.error("sendEmail: SMTP_HOST/SMTP_USER/SMTP_PASS are not set — email not sent.");
    return false;
  }

  try {
    const { from } = readSmtpConfig();
    await getTransporter().sendMail({ from, to, subject, html, text });
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
