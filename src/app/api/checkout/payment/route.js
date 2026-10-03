import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/auth/customerSession";
import { startCardPayment } from "@/lib/checkoutOrders";
import { CheckoutError } from "@/lib/checkoutPricing";
import { createRateLimiter } from "@/lib/rateLimit";

// Public: the storefront checkout's Place Order. Takes what the customer wants (items
// by id and quantity, addresses, a coupon code) and prices everything itself, then
// answers with the order number and the Stripe client secret the browser needs to
// confirm the payment. Prices, discounts and totals in the request are only checked,
// never trusted. A signed-in customer's session attaches the order to their account.
// Answers a 409 with `reason` and `details` when the cart or total has changed.

// Each call can create a Stripe PaymentIntent and an order, so a script shouldn't get far.
const allow = createRateLimiter({ limit: 12, windowMs: 10 * 60 * 1000 });

function clientKey(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request) {
  if (!allow(clientKey(request))) {
    return NextResponse.json({ success: false, error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "That request wasn't valid." }, { status: 400 });
  }

  try {
    const customer = await getCurrentCustomer();
    const data = await startCardPayment(body, customer);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json(
        { success: false, error: error.message, reason: error.reason || undefined, details: error.details || undefined },
        { status: error.status }
      );
    }
    console.error("Checkout payment failed", error);
    return NextResponse.json({ success: false, error: "We couldn't place your order right now. Please try again." }, { status: 500 });
  }
}
