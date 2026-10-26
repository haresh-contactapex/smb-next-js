import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { getCurrentCustomer } from "@/lib/auth/customerSession";
import { placeCodOrder, startCardPayment } from "@/lib/checkoutOrders";
import { CheckoutError } from "@/lib/checkoutPricing";
import { clientIpOf, createRateLimiter } from "@/lib/rateLimit";

// Public: the storefront checkout's Place Order. Takes what the customer wants (items
// by id and quantity, addresses, a coupon code) and prices everything itself, then
// answers with the order number and the Stripe client secret the browser needs to
// confirm the payment. Prices, discounts and totals in the request are only checked,
// never trusted. A signed-in customer's session attaches the order to their account.
// Answers a 409 with `reason` and `details` when the cart or total has changed.

// Each call can create a Stripe PaymentIntent and an order, so a script shouldn't get far.
const MAX_BODY_BYTES = 200_000;
const allow = createRateLimiter({ limit: 12, windowMs: 10 * 60 * 1000 });

export async function POST(request) {
  // No client address (no proxy, e.g. local dev) means nothing to count against, so no limit.
  const ip = clientIpOf(request);
  if (ip && !allow(ip)) {
    return NextResponse.json({ success: false, error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  // Addresses, a note and engraving text make a big cart body, but nowhere near this.
  const parsed = await readJsonBody(request, { maxBytes: MAX_BODY_BYTES });
  if (parsed.response) return parsed.response;
  const body = parsed.payload;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "That request wasn't valid." }, { status: 400 });
  }

  try {
    const customer = await getCurrentCustomer();
    // A cash-on-delivery order is the same request with `paymentMethod: "cod"`; anything else is a card order.
    const data = body.paymentMethod === "cod" ? await placeCodOrder(body, customer) : await startCardPayment(body, customer);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json(
        { success: false, error: publicErrorMessage(error), reason: error.reason || undefined, details: error.details || undefined },
        { status: error.status }
      );
    }
    console.error("Checkout payment failed", error);
    return NextResponse.json({ success: false, error: "We couldn't place your order right now. Please try again." }, { status: 500 });
  }
}
