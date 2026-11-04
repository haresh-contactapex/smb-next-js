import { failureFrom, ok, readJsonBody } from "@/lib/api";
import { clientIpOf } from "@/lib/rateLimit";
import { NewsletterError, subscribeToNewsletter } from "@/lib/newsletter";

// An email address and a few flags; anything near this size is not one.
const MAX_BODY_BYTES = 5_000;

// Public endpoint (the storefront has no login), so it is protected by validation, a honeypot
// and rate limits in subscribeToNewsletter rather than a session. The list for staff is
// /api/newsletter-subscribers.
export async function POST(request) {
  const body = await readJsonBody(request, { maxBytes: MAX_BODY_BYTES, tooLongMessage: "That request was too large." });
  if (body.response) return body.response;

  try {
    return ok(await subscribeToNewsletter({ payload: body.payload, clientKey: clientIpOf(request) }), 201);
  } catch (error) {
    return failureFrom(error, {
      KnownError: NewsletterError,
      fallbackMessage: "We couldn't subscribe you right now. Please try again.",
      label: "Newsletter subscription request",
    });
  }
}
