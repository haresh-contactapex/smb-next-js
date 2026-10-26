import { failureFrom, ok, readJsonBody } from "@/lib/api";
import { clientIpOf } from "@/lib/rateLimit";
import { ReviewError, submitStorefrontReview } from "@/lib/reviews";

// A review is a few short fields plus up to 5,000 characters of text (a
// handful of bytes each in UTF-8); anything near this size is not one.
const MAX_BODY_BYTES = 40_000;

// Public endpoint (the storefront has no login), so it is protected by
// validation, a honeypot, rate limits and moderation in submitStorefrontReview
// rather than a session. Reviews are saved as PENDING and never shown until
// a moderator approves them.
export async function POST(request) {
  const body = await readJsonBody(request, { maxBytes: MAX_BODY_BYTES, tooLongMessage: "Your review is too long." });
  if (body.response) return body.response;

  try {
    return ok(await submitStorefrontReview({ payload: body.payload, clientKey: clientIpOf(request) }), 201);
  } catch (error) {
    return failureFrom(error, {
      KnownError: ReviewError,
      fallbackMessage: "We couldn't save your review. Please try again.",
      label: "Storefront review",
    });
  }
}
