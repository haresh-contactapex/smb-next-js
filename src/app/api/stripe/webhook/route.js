import { NextResponse } from "next/server";
import { syncPaymentIntent } from "@/lib/checkoutOrders";
import { loadStripeConfig, retrievePaymentIntent, verifyStripeSignature } from "@/lib/stripe";

// Stripe's webhook endpoint (POST /api/stripe/webhook). Point a Stripe webhook at it for
// payment_intent.succeeded and payment_intent.payment_failed, and put the endpoint's
// signing secret (whsec_...) in STRIPE_WEBHOOK_SECRET. This is what marks an order Paid
// when a customer pays but closes the tab before the confirmation page loads.
//
// The body is read raw because the signature covers its exact bytes. The event is only
// a nudge: the PaymentIntent is read back from Stripe before anything is changed, so an
// out-of-order or replayed event can't set the wrong state.
const HANDLED = new Set(["payment_intent.succeeded", "payment_intent.payment_failed"]);

export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ success: false, error: "Webhook signing secret is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), secret)) {
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
    const stripe = await loadStripeConfig();
    if (!stripe.configured) throw new Error(stripe.problem);
    const intent = await retrievePaymentIntent(stripe.secretKey, event.data.object.id);
    await syncPaymentIntent(intent);
    return NextResponse.json({ success: true, data: { received: true } });
  } catch (error) {
    // A non-2xx makes Stripe retry later, which is what we want for a transient failure.
    console.error("Stripe webhook could not be processed", error.message);
    return NextResponse.json({ success: false, error: "Could not process the event." }, { status: 500 });
  }
}
