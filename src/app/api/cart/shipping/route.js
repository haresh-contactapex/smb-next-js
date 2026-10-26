import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { CartError, lookupShippingRules } from "@/lib/storefrontCart";

// A cart lookup is a few ids or a short address; anything near this size is not one.
const MAX_BODY_BYTES = 20_000;

// Public: the cart drawer's shipping estimator. Returns the store's shipping
// rules for a destination; the drawer prices them against the live cart.
export async function POST(request) {
  try {
    const parsed = await readJsonBody(request, { maxBytes: MAX_BODY_BYTES });
    if (parsed.response) return parsed.response;
    const body = parsed.payload ?? {};
    const data = await lookupShippingRules(body?.country, body?.zip, body?.state, body?.city);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof CartError) {
      return NextResponse.json({ success: false, error: publicErrorMessage(error), field: error.field || undefined }, { status: error.status });
    }
    console.error("Cart shipping estimate failed", error);
    return NextResponse.json({ success: false, error: "We couldn't estimate shipping right now. Please try again." }, { status: 500 });
  }
}
