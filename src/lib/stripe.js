import { createHmac, timingSafeEqual } from "crypto";
import { getPaymentSettings } from "./paymentSettings";
import { toMinorUnits } from "./currency";

// Server-only Stripe client. It talks to Stripe's REST API with fetch, so no SDK
// is needed. The keys come from Settings -> Payment; the secret key must never
// reach the browser, so only getStripePublicConfig() is safe to hand to a page.

const API_BASE = "https://api.stripe.com/v1";

export class StripeError extends Error {
  constructor(message, { status = 502, code = null, type = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.type = type;
  }
}

const PUBLISHABLE_KEY = /^pk_(test|live)_[A-Za-z0-9]+$/;
// A restricted key (rk_) works for PaymentIntents too, so it is accepted alongside sk_.
const SECRET_KEY = /^(?:sk|rk)_(test|live)_[A-Za-z0-9]+$/;

// Why Stripe can't take payments right now, or null when it can.
function configProblem(settings, publishable, secret) {
  if (!settings.stripeEnabled) return "Stripe is switched off in Settings -> Payment.";
  if (!publishable || !secret) return "The Stripe publishable and secret keys are not both saved in Settings -> Payment.";
  if (!publishable[1] || !secret[1]) return "A Stripe key in Settings -> Payment is not in the expected format.";
  if (publishable[1] !== secret[1]) return "The Stripe publishable and secret keys are from different modes (test and live).";
  return null;
}

// The saved Stripe settings, validated. `secretKey` is only filled when Stripe
// is usable. SERVER ONLY: never pass this object to a client component.
export async function loadStripeConfig() {
  const settings = await getPaymentSettings();
  const publishable = PUBLISHABLE_KEY.exec(settings.stripePublishableKey.trim());
  const secret = SECRET_KEY.exec(settings.stripeSecretKey.trim());
  const problem = configProblem(settings, publishable, secret);

  return {
    configured: problem === null,
    problem,
    enabled: settings.stripeEnabled,
    mode: problem === null ? publishable[1] : null,
    publishableKey: problem === null ? settings.stripePublishableKey.trim() : "",
    secretKey: problem === null ? settings.stripeSecretKey.trim() : "",
    // Settings -> Payment "auto capture": off means authorize now and capture later from the Stripe dashboard.
    captureAutomatically: settings.autoCapture,
  };
}

// What the checkout page may know: whether card payments work and the publishable key.
export function toStripePublicConfig(config) {
  return { configured: config.configured, mode: config.mode, publishableKey: config.publishableKey };
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

export function retrievePaymentIntent(secretKey, id) {
  return stripeRequest(secretKey, "GET", `/payment_intents/${encodeURIComponent(id)}`);
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
