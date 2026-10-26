import { fail, failureFrom, ok, readJsonBody } from "@/lib/api";
import { clientIpOf } from "@/lib/rateLimit";
import { ContactMessageError, submitContactMessage } from "@/lib/contactMessages";

// A message is a few short fields; anything near this size is not one.
const MAX_BODY_BYTES = 20_000;

// Public endpoint (the storefront has no login), so it is protected by
// validation, a honeypot and rate limits in submitContactMessage rather than a session.
export async function POST(request) {
  const body = await readJsonBody(request, { maxBytes: MAX_BODY_BYTES, tooLongMessage: "Your message is too long." });
  if (body.response) return body.response;

  try {
    return ok(await submitContactMessage({ payload: body.payload, clientKey: clientIpOf(request) }), 201);
  } catch (error) {
    return failureFrom(error, {
      KnownError: ContactMessageError,
      fallbackMessage: "We couldn't send your message. Please try again.",
      label: "Contact message request",
    });
  }
}
