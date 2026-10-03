import { createHmac, timingSafeEqual } from "crypto";
import { getPaymentSettings } from "./paymentSettings";
import { toMinorUnits } from "./currency";
import { PUBLISHABLE_KEY, SECRET_KEY, WEBHOOK_SECRET } from "./stripeKeys";

// Server-only Stripe client. It talks to Stripe's REST API with fetch, so no SDK
// is needed. Every credential (publishable key, secret key, webhook signing secret)
// comes from Settings -> Payment, never from the environment. The secret key and the
// signing secret must never reach the browser, so only toStripePublicConfig() is safe
// to hand to a page.

const API_BASE = "https://api.stripe.com/v1";

export class StripeError extends Error {
  constructor(message, { status = 502, code = null, type = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.type = type;
  }
}

// Why the saved keys can't be used, or null when they can (they are present, in the
// expected format, and from the same mode).
function keyProblem(publishable, secret) {
  if (!publishable || !secret) return "The Stripe publishable and secret keys are not both saved in Settings -> Payment.";
  if (!publishable[1] || !secret[1]) return "A Stripe key in Settings -> Payment is not in the expected format.";
  if (publishable[1] !== secret[1]) return "The Stripe publishable and secret keys are from different modes (test and live).";
  return null;
}

// The saved Stripe settings, validated. SERVER ONLY: never pass this object to a client component.
//   hasKeys     the publishable and secret keys are usable. That is all it takes to settle a payment
//               that is already under way (the confirmation page, the webhook), even if an admin has
//               since switched Stripe off.
//   configured  hasKeys and Stripe is switched on: the only state in which a new payment may start.
//   webhookSecret  the saved signing secret, or "" when it is missing or isn't a whsec_ value.
// The key fields are blank unless hasKeys.
export async function loadStripeConfig() {
  const settings = await getPaymentSettings();
  const publishable = PUBLISHABLE_KEY.exec(settings.stripePublishableKey.trim());
  const secret = SECRET_KEY.exec(settings.stripeSecretKey.trim());
  const keysProblem = keyProblem(publishable, secret);
  const hasKeys = keysProblem === null;
  const webhook = settings.stripeWebhookSecret.trim();

  return {
    hasKeys,
    configured: hasKeys && settings.stripeEnabled,
    enabled: settings.stripeEnabled,
    problem: !settings.stripeEnabled ? "Stripe is switched off in Settings -> Payment." : keysProblem,
    mode: hasKeys ? publishable[1] : null,
    publishableKey: hasKeys ? settings.stripePublishableKey.trim() : "",
    secretKey: hasKeys ? settings.stripeSecretKey.trim() : "",
    webhookSecret: WEBHOOK_SECRET.test(webhook) ? webhook : "",
    // Settings -> Payment "auto capture": off means authorize now and capture later from the Stripe dashboard.
    captureAutomatically: settings.autoCapture,
  };
}

// What the checkout page may know: whether card payments can be taken now, the mode and
// the publishable key. Nothing secret.
export function toStripePublicConfig(config) {
  return {
    configured: config.configured,
    mode: config.mode,
    publishableKey: config.configured ? config.publishableKey : "",
  };
}

// Stripe takes form-encoded bodies with bracketed keys: metadata[order_id]=...
function appendForm(params, prefix, value) {
  if (value === undefined || value === null || value === "") return;
  if (typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) appendForm(params, prefix ? `${prefix}[${key}]` : key, inner);
    return;
  }
  params.append(prefix, String(value));
}

function encodeForm(body) {
  const params = new URLSearchParams();
  appendForm(params, "", body);
  return params.toString();
}

async function stripeRequest(secretKey, method, path, body, { idempotencyKey } = {}) {
  const headers = { Authorization: `Bearer ${secretKey}` };
  if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? encodeForm(body) : undefined, cache: "no-store" });
  } catch {
    throw new StripeError("We couldn't reach Stripe.", { status: 502 });
  }

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const error = json?.error || {};
    throw new StripeError(error.message || "Stripe rejected the request.", { status: response.status, code: error.code, type: error.type });
  }
  return json;
}

// An authorization to collect `amount`, tied to one of our orders through
// metadata.order_id. The Payment Element in the browser confirms it with the
// client secret. `shipping` is passed so Stripe's fraud checks can see it.
export async function createPaymentIntent(secretKey, { orderId, amount, currency, receiptEmail, description, shipping, captureAutomatically }) {
  return stripeRequest(
    secretKey,
    "POST",
    "/payment_intents",
    {
      amount: toMinorUnits(amount, currency),
      currency: String(currency).toLowerCase(),
      automatic_payment_methods: { enabled: true },
      capture_method: captureAutomatically ? "automatic" : "manual",
      description,
      receipt_email: receiptEmail,
      metadata: { order_id: orderId },
      shipping,
    },
    { idempotencyKey: `checkout-${orderId}` }
  );
}

// `expand` swaps the named id fields for their full objects (e.g. "payment_method").
export function retrievePaymentIntent(secretKey, id, { expand = [] } = {}) {
  const query = new URLSearchParams(expand.map((field) => ["expand[]", field])).toString();
  return stripeRequest(secretKey, "GET", `/payment_intents/${encodeURIComponent(id)}${query ? `?${query}` : ""}`);
}

export function cancelPaymentIntent(secretKey, id) {
  return stripeRequest(secretKey, "POST", `/payment_intents/${encodeURIComponent(id)}/cancel`, {});
}

// Checks a webhook's Stripe-Signature header: `t=<unix time>,v1=<hex hmac>` where the
// HMAC-SHA256 is over "<t>.<raw body>" with the endpoint's signing secret. A timestamp
// outside the tolerance is rejected so an old capture can't be replayed.
export function verifyStripeSignature(rawBody, header, secret, toleranceSeconds = 300) {
  if (!header || !secret) return false;

  let timestamp = null;
  const signatures = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = Number(value);
    if (key === "v1" && value) signatures.push(value);
  }
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((signature) => {
    const given = Buffer.from(signature, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
