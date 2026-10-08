import { getGeneralSettings } from "./generalSettings";
import { getStoreSettings } from "./storeSettings";
import { createRateLimiter } from "./rateLimit";
import { isEmailConfigured, sendContactMessageAdminEmail, sendContactMessageConfirmationEmail } from "./email";
import { checkRecaptchaIfEnabled } from "./auth/recaptcha";
import { normalizeContact, validateContact } from "@/components/storefront/contact/helpers";

// Server side of the storefront Contact form. Nothing is stored: the message is
// emailed to the store (Settings -> Store support email, else Settings ->
// General store email) and the visitor gets a confirmation copy.

// Thrown for problems the visitor can understand; the route turns `status` into the HTTP status.
export class ContactMessageError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// The confirmation goes to an address the visitor typed, so cap how often one
// address (and one client) can trigger email. Separate instances from the
// "Ask a question" form's, so the two forms don't spend each other's allowance.
const clientLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });
const addressLimiter = createRateLimiter({ limit: 3, windowMs: 60 * 60 * 1000 });

const UNAVAILABLE = "We couldn't send your message right now. Please try again later.";

// Both settings reads are best-effort, so a missing row doesn't hide the form's real error.
async function loadStoreContact() {
  const [general, store] = await Promise.all([getGeneralSettings().catch(() => null), getStoreSettings().catch(() => null)]);
  return {
    storeName: general?.storeName || "Shop My Band",
    recipient: store?.supportEmail || general?.storeEmail || "",
  };
}

// `payload` is the raw request body and `clientKey` identifies the caller for
// rate limiting. Resolves to { confirmationSent }; the store's copy must go out
// or this throws.
export async function submitContactMessage({ payload, clientKey }) {
  // A bot that fills the hidden field is told it worked and nothing is sent.
  if (String(payload?.honeypot ?? "").trim()) return { confirmationSent: false };

  const values = normalizeContact(payload);
  const firstError = Object.values(validateContact(values))[0];
  if (firstError) throw new ContactMessageError(firstError);

  // Only when Settings -> Security and Settings -> Integrations turn Google reCAPTCHA on.
  const recaptcha = await checkRecaptchaIfEnabled(payload?.recaptchaToken);
  if (recaptcha.required && !recaptcha.valid) {
    throw new ContactMessageError("reCAPTCHA verification failed. Please try again.");
  }

  // No short-circuit: both limiters record the attempt, so neither count drifts.
  const allowed = [clientLimiter(clientKey), addressLimiter(values.email.toLowerCase())];
  if (allowed.includes(false)) {
    throw new ContactMessageError("You've sent a few messages already. Please wait a little while before sending another.", 429);
  }

  const { storeName, recipient } = await loadStoreContact();
  if (!recipient || !(await isEmailConfigured())) {
    console.error("contactMessages: no store email address or SMTP configuration — message not sent.");
    throw new ContactMessageError(UNAVAILABLE, 503);
  }

  // The store's copy is the only record of the message, so failing to send it is an error.
  if (!(await sendContactMessageAdminEmail({ to: recipient, storeName, contact: values }))) {
    throw new ContactMessageError(UNAVAILABLE, 503);
  }

  // Awaited rather than fire-and-forget: a serverless function can be frozen the
  // moment the response is sent. A failure only means no confirmation copy.
  const confirmationSent = await sendContactMessageConfirmationEmail({
    to: values.email,
    storeName,
    contact: values,
    replyTo: recipient,
  });

  return { confirmationSent };
}
