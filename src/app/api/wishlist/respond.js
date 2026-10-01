import { NextResponse } from "next/server";
import { WishlistError } from "@/lib/wishlist";
import { getCurrentCustomer } from "@/lib/auth/customerSession";

export const ok = (data) => NextResponse.json({ success: true, data });

// A visitor-fixable problem keeps its own status and message; anything else is
// logged and reported generically.
export function failure(error, fallbackMessage) {
  if (error instanceof WishlistError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  console.error("Wishlist request failed", error);
  return NextResponse.json({ success: false, error: fallbackMessage }, { status: 500 });
}

// Saving to an account needs a customer session. Guests keep their list in the
// browser, so the storefront treats this 401 as "stay a guest".
export async function requireCustomer() {
  const customer = await getCurrentCustomer();
  if (customer) return { customer };
  return {
    response: NextResponse.json({ success: false, error: "Sign in to save items to your account wishlist." }, { status: 401 }),
  };
}
