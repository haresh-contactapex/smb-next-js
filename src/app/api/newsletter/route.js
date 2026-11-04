import { fail, failureFrom, ok, readJsonBody } from "@/lib/api";
import { clientIpOf } from "@/lib/rateLimit";
import { NewsletterError, subscribeToNewsletter } from "@/lib/newsletter";

// An email address and a few flags; anything near this size is not one.
const MAX_BODY_BYTES = 5_000;

// A page on another site can make a visitor's browser POST here (a plain <form>, or fetch with a
// text/plain body) and so sign up addresses the visitor never typed. Browsers label every request
// with Sec-Fetch-Site, so a request that says it came from another site is refused, and the body
// must be declared JSON, which a cross-site page cannot send without a CORS preflight this app
// never answers. Requests with no such header (curl, server-to-server) are still limited by the
// rate limits in subscribeToNewsletter.
function isCrossSite(request) {
  const site = request.headers.get("sec-fetch-site");
  return Boolean(site) && site !== "same-origin" && site !== "none";
}

function isJson(request) {
  return (request.headers.get("content-type") || "").toLowerCase().startsWith("application/json");
}

// Public endpoint (the storefront has no login), so it is protected by validation, a honeypot
// and rate limits in subscribeToNewsletter rather than a session. The list for staff is
// /api/newsletter-subscribers.
export async function POST(request) {
  if (isCrossSite(request)) return fail("That request isn't allowed.", 403);
  if (!isJson(request)) return fail("Invalid request.", 415);

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
