import { getStorefrontProductByHandle } from "./products";
import { getGeneralSettings } from "./generalSettings";
import { getStoreSettings } from "./storeSettings";
import { createRateLimiter } from "./rateLimit";
import { isEmailConfigured, sendProductQuestionAdminEmail, sendProductQuestionConfirmationEmail } from "./email";
import { normalizeQuestion, validateQuestion } from "@/components/storefront/ask-question/helpers";

// Server side of the product page's "Ask a question" form. Nothing is stored:
// the question is emailed to the store (Settings -> Store support email, else
// Settings -> General store email) and the shopper gets a confirmation copy.

// Thrown for problems the visitor can understand; the route turns `status` into the HTTP status.
export class ProductQuestionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// The confirmation goes to an address the visitor typed, so cap how often one
// address (and one client) can trigger email.
const clientLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });
const addressLimiter = createRateLimiter({ limit: 3, windowMs: 60 * 60 * 1000 });

const MAX_HANDLE_LENGTH = 200;
const UNAVAILABLE = "We couldn't send your question right now. Please try again later.";

// Both settings reads are best-effort, so a missing row doesn't hide the form's real error.
async function loadStoreContact() {
  const [general, store] = await Promise.all([getGeneralSettings().catch(() => null), getStoreSettings().catch(() => null)]);
  return {
    storeName: general?.storeName || "Shop My Band",
    recipient: store?.supportEmail || general?.storeEmail || "",
  };
}

// `payload` is the raw request body, `clientKey` identifies the caller for rate
// limiting and `origin` builds the product link used in the emails. Resolves to
// { confirmationSent }; the store's copy must go out or this throws.
export async function submitProductQuestion({ payload, clientKey, origin }) {
  // A bot that fills the hidden field is told it worked and nothing is sent.
  if (String(payload?.honeypot ?? "").trim()) return { confirmationSent: false };

  const values = normalizeQuestion(payload);
  const firstError = Object.values(validateQuestion(values))[0];
  if (firstError) throw new ProductQuestionError(firstError);

  const handle = typeof payload?.handle === "string" ? payload.handle.trim() : "";
  if (!handle || handle.length > MAX_HANDLE_LENGTH) throw new ProductQuestionError("Choose a valid product.");

  // No short-circuit: both limiters record the attempt, so neither count drifts.
  const allowed = [clientLimiter(clientKey), addressLimiter(values.email.toLowerCase())];
  if (allowed.includes(false)) {
    throw new ProductQuestionError("You've sent a few questions already. Please wait a little while before sending another.", 429);
  }

  // Title and SKU come from the catalog, not from the request.
  const found = await getStorefrontProductByHandle(handle);
  if (!found) throw new ProductQuestionError("This product could not be found.", 404);
  const product = {
    title: found.title,
    sku: found.sku || "",
    url: `${origin}/products/${encodeURIComponent(found.handle)}`,
  };

  const { storeName, recipient } = await loadStoreContact();
  if (!recipient || !(await isEmailConfigured())) {
    console.error("productQuestions: no store email address or SMTP configuration — question not sent.");
    throw new ProductQuestionError(UNAVAILABLE, 503);
  }

  // The store's copy is the only record of the question, so failing to send it is an error.
  if (!(await sendProductQuestionAdminEmail({ to: recipient, storeName, question: values, product }))) {
    throw new ProductQuestionError(UNAVAILABLE, 503);
  }

  // Awaited rather than fire-and-forget: a serverless function can be frozen the
  // moment the response is sent. A failure only means no confirmation copy.
  const confirmationSent = await sendProductQuestionConfirmationEmail({
    to: values.email,
    storeName,
    question: values,
    product,
    replyTo: recipient,
  });

  return { confirmationSent };
}
