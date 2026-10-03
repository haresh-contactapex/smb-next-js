import { NextResponse } from "next/server";
import { syncPaymentIntent } from "@/lib/checkoutOrders";
import { loadStripeConfig, retrievePaymentIntent, verifyStripeSignature } from "@/lib/stripe";

// Stripe's webhook endpoint (POST /api/stripe/webhook). In the Stripe Dashboard
// (Developers -> Webhooks) add an endpoint with this URL for payment_intent.succeeded and
// payment_intent.payment_failed, then paste the endpoint's signing secret (whsec_...) into
// Settings -> Payment -> Stripe. Like the API keys it is read from there, not from the
// environment. This is what marks an order Paid when a customer pays but closes the tab
// before the confirmation page loads.
//
// The body is read raw because the signature covers its exact bytes. The event is only
// a nudge: the PaymentIntent is read back from Stripe before anything is changed, so an
// out-of-order or replayed event can't set the wrong state. It keeps working after Stripe
// is switched off in Settings -> Payment, so payments already under way can still settle.
const HANDLED = new Set(["payment_intent.succeeded", "payment_intent.payment_failed"]);

export async function POST(request) {
  let stripe;
  try {
    stripe = await loadStripeConfig();
  } catch (error) {
    console.error("Stripe webhook could not read Settings -> Payment", error.message);
    return NextResponse.json({ success: false, error: "Payment settings could not be read." }, { status: 500 });
  }
  if (!stripe.webhookSecret || !stripe.hasKeys) {
    console.error("Stripe webhook received but the keys and webhook signing secret are not saved in Settings -> Payment.");
    return NextResponse.json({ success: false, error: "Stripe is not set up to receive webhooks." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), stripe.webhookSecret)) {
    return NextResponse.json({ success: false, error: "Invalid signature." }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid payload." }, { status: 400 });
  }
  if (!HANDLED.has(event?.type) || !event.data?.object?.id) return NextResponse.json({ success: true, data: { received: true } });

  try {
    const intent = await retrievePaymentIntent(stripe.secretKey, event.data.object.id);
    await syncPaymentIntent(intent);
    return NextResponse.json({ success: true, data: { received: true } });
  } catch (error) {
    // A non-2xx makes Stripe retry later, which is what we want for a transient failure.
    console.error("Stripe webhook could not be processed", error.message);
    return NextResponse.json({ success: false, error: "Could not process the event." }, { status: 500 });
  }
}
