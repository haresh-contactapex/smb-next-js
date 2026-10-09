import nodemailer from "nodemailer";
import { getEmailSettings, getEmailTransportSettings } from "./emailSettings";
import { getGeneralSettings } from "./generalSettings";
import { readFile } from "fs/promises";
import path from "path";
import { buildNewOrderAlertEmail, buildOrderConfirmationEmail, buildOrderStatusEmail, buildRefundRequestAlertEmail } from "./orderEmail";
import { buildCustomerWelcomeEmail, buildLoginOtpEmail, buildNewCustomerAlertEmail, buildPasswordResetEmail, buildProductQuestionAlertEmail, buildProductQuestionConfirmationEmail, buildStaffWelcomeEmail } from "./notificationEmail";
import { buildContactMessageAlertEmail, buildContactMessageConfirmationEmail } from "./notificationEmail";
import { getSiteOrigin, isPublicOrigin } from "./siteUrl";

const LOGO_CID = "shopmyband-logo";

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
// `replyTo` is optional: an address, or { name, address }.
export async function sendEmail({ to, subject, html, text, replyTo, attachments }) {
  const config = await readSmtpConfig();
  if (!isCompleteConfig(config)) {
    console.error("sendEmail: SMTP is not configured in Settings -> Email or SMTP_* env vars — email not sent.");
    return false;
  }

  try {
    const body = withFooter({ html, text }, config.footerText);
    await getTransporter(config).sendMail({ from: config.from, to, subject, replyTo, attachments, ...body });
    return true;
  } catch (error) {
    console.error("sendEmail: failed to send", error);
    return false;
  }
}

// The account and enquiry emails use the order emails' design (see notificationEmail.js). They
// carry the logo and the store's address like the order emails do, so the callers pass only what is
// particular to the email. `replyTo` is optional: an address, or { name, address }.
async function sendBrandedEmail(to, build, data, { replyTo } = {}) {
  const shopUrl = await getSiteOrigin();
  const emailSettings = await getEmailSettings().catch(() => null);
  const storeName = data.storeName || (await getGeneralSettings().catch(() => null))?.storeName || "Shop My Band";
  const { logoSrc, attachments } = await loadEmailLogo(shopUrl);
  const { subject, html, text } = build({ ...data, storeName, shopUrl, logoSrc, supportEmail: emailSettings?.senderEmail || "" });
  return sendEmail({ to, subject, html, text, replyTo, attachments });
}

export async function sendPasswordResetEmail({ to, resetLink }) {
  return sendBrandedEmail(to, buildPasswordResetEmail, { resetLink });
}

export async function sendCustomerWelcomeEmail({ to, firstName, storeName }) {
  return sendBrandedEmail(to, buildCustomerWelcomeEmail, { storeName, firstName });
}

// Notifies the store's contact address (Settings -> General -> Store Email)
// of a new signup — a lightweight "someone joined" notice, not a
// transactional email the customer is waiting on, so a delivery failure here
// is logged (by sendEmail) but never surfaces to the registering customer.
export async function sendNewCustomerAdminNotification({ to, customer, storeName }) {
  const origin = await getSiteOrigin();
  const adminUrl = origin ? `${origin}/admin/${customer.id ? `edit-customer/${encodeURIComponent(customer.id)}` : "all-customers"}` : null;
  return sendBrandedEmail(to, buildNewCustomerAlertEmail, { storeName, customer, adminUrl });
}

// Sent when an admin creates a staff account on Users -> Add User. The
// account starts with a random password; the link lets the new user replace
// it (it reuses the staff reset-password flow).
export async function sendStaffWelcomeEmail({ to, firstName, storeName, temporaryPassword, setPasswordLink, loginLink, linkExpiresInHours }) {
  return sendBrandedEmail(to, buildStaffWelcomeEmail, { to, firstName, storeName, temporaryPassword, setPasswordLink, loginLink, linkExpiresInHours });
}

// Sent after a staff member's password is verified but before their session
// is created (src/lib/auth/loginOtp.js) — the 2FA step for Settings ->
// Security's "Require Two-Factor Auth" and the per-user toggle on Users /
// Profile. Best-effort like every other email here, but the login route
// still treats a failed send as the request failing — a code nobody receives
// is a dead end, not a degraded experience.
export async function sendLoginOtpEmail({ to, firstName, code, expiresInSeconds, audience = "staff" }) {
  return sendBrandedEmail(to, buildLoginOtpEmail, { firstName, code, expiresInSeconds, audience });
}

// Sent to the store when a shopper uses "Ask a question" on a product page.
// Reply-To is the shopper, so answering the email answers them directly.
// Everything in `question` is visitor input and is escaped by the template.
export async function sendProductQuestionAdminEmail({ to, storeName, question, product }) {
  return sendBrandedEmail(to, buildProductQuestionAlertEmail, { storeName, question, product }, { replyTo: { name: question.name, address: question.email } });
}

// Sent to the shopper to confirm the store received their question. Replies go
// to `replyTo` (the store's support address) rather than the no-reply sender.
export async function sendProductQuestionConfirmationEmail({ to, storeName, question, product, replyTo }) {
  return sendBrandedEmail(to, buildProductQuestionConfirmationEmail, { storeName, question, product }, { replyTo: replyTo || undefined });
}

// Sent to the store when a visitor uses the storefront Contact form. Reply-To is the
// visitor, so answering the email answers them directly. Everything in `contact`
// ({ name, email, phone, message }) is visitor input and is escaped by the template.
export async function sendContactMessageAdminEmail({ to, storeName, contact }) {
  return sendBrandedEmail(to, buildContactMessageAlertEmail, { storeName, contact }, { replyTo: { name: contact.name, address: contact.email } });
}

// Sent to the visitor to confirm the store received their message. Replies go to
// `replyTo` (the store's support address) rather than the no-reply sender.
export async function sendContactMessageConfirmationEmail({ to, storeName, contact, replyTo }) {
  return sendBrandedEmail(to, buildContactMessageConfirmationEmail, { storeName, contact }, { replyTo: replyTo || undefined });
}

// The logo travels inside order emails (an inline attachment the HTML points at with cid:), so it
// shows wherever the email is opened, including a store that isn't public yet. If the file can't
// be read here (some hosts don't ship /public with server code) the public address of the same
// file is used when there is one, else the email shows the wordmark as text.
async function loadEmailLogo(shopUrl) {
  let logoSrc = isPublicOrigin(shopUrl) ? `${shopUrl}/storefront/logo.png` : null;
  let attachments;
  try {
    const content = await readFile(path.join(process.cwd(), "public", "storefront", "logo.png"));
    attachments = [{ filename: "logo.png", content, cid: LOGO_CID, contentType: "image/png", contentDisposition: "inline" }];
    logoSrc = `cid:${LOGO_CID}`;
  } catch {
    // keep the URL (or nothing)
  }
  return { logoSrc, attachments };
}

// Outlook (and Gmail by default for some senders) blocks pictures that live on another server until
// the reader allows them, leaving a red cross. So each product photo is fetched here and attached to the
// email (cid:), like the logo. Outlook also can't show WebP (what most of the catalog is stored as) and
// the original uploads can be several megabytes, so every photo is shrunk to a small JPEG thumbnail
// first (shown at 60px, stored at 120px for sharp screens). A photo that can't be fetched or converted is
// left out and the email shows a plain grey square instead.
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_EMBEDDED_IMAGES = 6;
const THUMBNAIL_PX = 120;

async function toThumbnail(content) {
  const { default: sharp } = await import("sharp");
  return sharp(content).rotate().resize(THUMBNAIL_PX, THUMBNAIL_PX, { fit: "cover" }).flatten({ background: "#ffffff" }).jpeg({ quality: 80 }).toBuffer();
}

async function loadItemImage(source) {
  try {
    let content;
    if (/^https:\/\//.test(source)) {
      const response = await fetch(source, { signal: AbortSignal.timeout(8000) });
      if (!response.ok || !(response.headers.get("content-type") || "").startsWith("image/")) return null;
      content = Buffer.from(await response.arrayBuffer());
    } else if (source.startsWith("/")) {
      // An upload kept in /public (never anything outside it).
      const root = path.join(process.cwd(), "public");
      const file = path.join(root, source.split("?")[0]);
      if (!file.startsWith(root + path.sep)) return null;
      content = await readFile(file);
    } else {
      return null;
    }
    if (content.length > MAX_SOURCE_BYTES) return null;
    return { content: await toThumbnail(content), contentType: "image/jpeg" };
  } catch (error) {
    console.error("email: product photo left out", error.message);
    return null;
  }
}

async function embedItemImages(items = []) {
  const attachments = [];
  const embedded = await Promise.all(
    items.map(async (item, index) => {
      if (!item.imageUrl || index >= MAX_EMBEDDED_IMAGES) return { ...item, imageUrl: null };
      const image = await loadItemImage(item.imageUrl);
      if (!image) return { ...item, imageUrl: null };
      const cid = `item-${index}@shopmyband`;
      attachments.push({ filename: `item-${index}.jpg`, content: image.content, cid, contentType: image.contentType, contentDisposition: "inline" });
      return { ...item, imageUrl: `cid:${cid}` };
    })
  );
  return { items: embedded, attachments };
}

// The order emails (see orderEmail.js for what each carries). All of them go out from the sender
// name and address saved in Settings -> Email, like every other email.
async function sendOrderEmail(to, build, data, subjectPrefix = "") {
  const [{ logoSrc, attachments: logo = [] }, images] = await Promise.all([loadEmailLogo(data.shopUrl), embedItemImages(data.items)]);
  const { subject, html, text } = build({ ...data, ...(data.items ? { items: images.items } : {}), logoSrc });
  return sendEmail({ to, subject: `${subjectPrefix}${subject}`, html, text, attachments: [...logo, ...images.attachments] });
}

// To the customer once an order is placed (cash on delivery) or paid (card).
export async function sendOrderConfirmationEmail({ to, subjectPrefix, ...data }) {
  return sendOrderEmail(to, buildOrderConfirmationEmail, data, subjectPrefix);
}

// To the customer when their order is Processing, Completed or Cancelled, or its payment failed.
export async function sendOrderStatusEmail(kind, { to, subjectPrefix, ...data }) {
  return sendOrderEmail(to, (details) => buildOrderStatusEmail(kind, details), data, subjectPrefix);
}

// To the store when a new order arrives.
export async function sendNewOrderAlertEmail({ to, subjectPrefix, ...data }) {
  return sendOrderEmail(to, buildNewOrderAlertEmail, data, subjectPrefix);
}

// To the store when a customer cancels a paid order, so it can refund it by hand.
export async function sendRefundRequestAlertEmail({ to, subjectPrefix, ...data }) {
  return sendOrderEmail(to, buildRefundRequestAlertEmail, data, subjectPrefix);
}
