import { NextResponse } from "next/server";
import { CartError, lookupCartProducts } from "@/lib/storefrontCart";

// Public: the cart page's color/size pickers. Returns the options and variants
// of the products in the visitor's cart; nothing here depends on who is asking.
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await lookupCartProducts(body?.productIds);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof CartError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("Cart product lookup failed", error);
    return NextResponse.json({ success: false, error: "We couldn't load the options for your items right now. Please try again." }, { status: 500 });
  }
}
