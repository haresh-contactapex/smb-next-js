import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api";
import { publicErrorMessage } from "@/lib/publicError";
import { CartError, lookupCartProducts } from "@/lib/storefrontCart";

// A cart lookup is a few ids or a short address; anything near this size is not one.
const MAX_BODY_BYTES = 20_000;

// Public: the cart page's color/size pickers. Returns the options and variants
// of the products in the visitor's cart; nothing here depends on who is asking.
export async function POST(request) {
  try {
    const parsed = await readJsonBody(request, { maxBytes: MAX_BODY_BYTES });
    if (parsed.response) return parsed.response;
    const body = parsed.payload ?? {};
    const data = await lookupCartProducts(body?.productIds);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof CartError) {
      return NextResponse.json({ success: false, error: publicErrorMessage(error) }, { status: error.status });
    }
    console.error("Cart product lookup failed", error);
    return NextResponse.json({ success: false, error: "We couldn't load the options for your items right now. Please try again." }, { status: 500 });
  }
}
