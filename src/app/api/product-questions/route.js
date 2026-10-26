import { failureFrom, ok, readJsonBody } from "@/lib/api";
import { clientIpOf } from "@/lib/rateLimit";
import { ProductQuestionError, submitProductQuestion } from "@/lib/productQuestions";
import { getTrustedOrigin } from "@/lib/siteUrl";

// A question is a few short fields; anything near this size is not one.
const MAX_BODY_BYTES = 20_000;

// Public endpoint (the storefront has no login), so it is protected by
// validation, a honeypot and rate limits in submitProductQuestion rather than a session.
export async function POST(request) {
  const body = await readJsonBody(request, { maxBytes: MAX_BODY_BYTES, tooLongMessage: "Your question is too long." });
  if (body.response) return body.response;

  try {
    const data = await submitProductQuestion({
      payload: body.payload,
      clientKey: clientIpOf(request),
      origin: getTrustedOrigin(request),
    });
    return ok(data, 201);
  } catch (error) {
    return failureFrom(error, {
      KnownError: ProductQuestionError,
      fallbackMessage: "We couldn't send your question. Please try again.",
      label: "Product question request",
    });
  }
}
