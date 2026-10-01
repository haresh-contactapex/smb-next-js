import { NextResponse } from "next/server";
import { CartError, lookupCartCoupon } from "@/lib/storefrontCart";

// Public: the cart drawer checks a discount code for the visitor's cart.
// It exposes only the rule (type, value, minimum, eligible products), never
// the coupon's internal description or usage counters.
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await lookupCartCoupon(body?.code, body?.productIds);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof CartError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Cart coupon lookup failed", error);
    return NextResponse.json({ success: false, error: "We couldn't check that code right now. Please try again." }, { status: 500 });
  }
}
