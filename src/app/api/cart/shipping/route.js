import { NextResponse } from "next/server";
import { CartError, lookupShippingRules } from "@/lib/storefrontCart";

// Public: the cart drawer's shipping estimator. Returns the store's shipping
// rules for a destination; the drawer prices them against the live cart.
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await lookupShippingRules(body?.country, body?.zip);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof CartError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Cart shipping estimate failed", error);
    return NextResponse.json({ success: false, error: "We couldn't estimate shipping right now. Please try again." }, { status: 500 });
  }
}
