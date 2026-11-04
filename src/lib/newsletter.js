import { sql } from "./db";
import { getGeneralSettings } from "./generalSettings";
import { getStoreSettings } from "./storeSettings";
import { createRateLimiter } from "./rateLimit";
import { isEmailConfigured, sendNewsletterSubscriberAlertEmail, sendNewsletterWelcomeEmail } from "./email";
import { checkRecaptchaIfEnabled } from "./auth/recaptcha";
import { normalizeNewsletterEmail, validateNewsletterEmail } from "@/lib/shared/newsletter";

// Server side of the home page "Stay in the Loop" signup and of Admin -> Newsletter.
// An address is stored once; the subscriber gets a welcome email and the store (Settings ->
// General store email, else Settings -> Store support email) gets a "new subscriber" notice.

// Thrown for problems the visitor can understand; the route turns `status` into the HTTP status.
export class NewsletterError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// The welcome email goes to an address the visitor typed, so cap how often one address
// (and one client) can trigger email.
const clientLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });
const addressLimiter = createRateLimiter({ limit: 3, windowMs: 60 * 60 * 1000 });

function mapSubscriber(row) {
  return { id: row.id, email: row.email, source: row.source, createdAt: row.created_at };
}

// `payload` is the raw request body and `clientKey` identifies the caller for rate limiting.
// Resolves to { alreadySubscribed }. Both emails are best-effort: the address is saved first,
// so a mail problem never turns a successful signup into an error.
export async function subscribeToNewsletter({ payload, clientKey }) {
  // A bot that fills the hidden field is told it worked and nothing is stored or sent.
  if (String(payload?.honeypot ?? "").trim()) return { alreadySubscribed: false };

  const email = normalizeNewsletterEmail(payload?.email);
  const problem = validateNewsletterEmail(email);
  if (problem) throw new NewsletterError(problem);

  // Only when Settings -> Security and Settings -> Integrations turn Google reCAPTCHA on.
  const recaptcha = await checkRecaptchaIfEnabled(payload?.recaptchaToken);
  if (recaptcha.required && !recaptcha.valid) {
    throw new NewsletterError("reCAPTCHA verification failed. Please try again.");
  }

  // No short-circuit: both limiters record the attempt, so neither count drifts.
  const allowed = [clientLimiter(clientKey), addressLimiter(email)];
  if (allowed.includes(false)) {
    throw new NewsletterError("Too many attempts. Please wait a little while and try again.", 429);
  }

  const [created] = await sql`
    INSERT INTO newsletter_subscribers (email) VALUES (${email})
    ON CONFLICT (email) DO NOTHING
    RETURNING id, email, source, created_at
  `;
  if (!created) return { alreadySubscribed: true };

  await notifyNewSubscriber(mapSubscriber(created));
  return { alreadySubscribed: false };
}

// Awaited rather than fire-and-forget: a serverless function can be frozen the moment the
// response is sent. Failures are logged by sendEmail and never reach the visitor.
async function notifyNewSubscriber(subscriber) {
  try {
    if (!(await isEmailConfigured())) {
      console.error("newsletter: SMTP is not configured — subscriber saved but no emails sent.");
      return;
    }
    const [general, store] = await Promise.all([getGeneralSettings().catch(() => null), getStoreSettings().catch(() => null)]);
    const storeName = general?.storeName || "Shop My Band";
    const recipient = general?.storeEmail || store?.supportEmail || "";

    await sendNewsletterWelcomeEmail({ to: subscriber.email, storeName, replyTo: recipient });
    if (recipient) await sendNewsletterSubscriberAlertEmail({ to: recipient, storeName, subscriber });
    else console.error("newsletter: no store email address — admin notification not sent.");
  } catch (error) {
    console.error("newsletter: notification emails failed", error);
  }
}

export async function listNewsletterSubscribers() {
  const rows = await sql`SELECT id, email, source, created_at FROM newsletter_subscribers ORDER BY created_at DESC`;
  return rows.map(mapSubscriber);
}

export async function deleteNewsletterSubscribers(ids) {
  const rows = await sql`DELETE FROM newsletter_subscribers WHERE id = ANY(${ids}::uuid[]) RETURNING id`;
  return rows.length;
}

// A spreadsheet runs a cell that starts with one of these as a formula; the address comes from a
// public form, so it is made harmless before it goes into a file the store opens in one.
function toCsvField(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function exportNewsletterSubscribersToCsv() {
  const subscribers = await listNewsletterSubscribers();
  const lines = subscribers.map((s) => [s.email, s.source, new Date(s.createdAt).toISOString()].map(toCsvField).join(","));
  return ["Email,Source,Subscribed at", ...lines].join("\n");
}
