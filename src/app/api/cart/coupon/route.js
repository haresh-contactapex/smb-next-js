import { failureFrom, ok, readJsonBody } from "@/lib/api";
import { CartError, lookupCartCoupon } from "@/lib/storefrontCart";

// A cart lookup is a few ids or a short address; anything near this size is not one.
const MAX_BODY_BYTES = 20_000;

// Public: the cart drawer checks a discount code for the visitor's cart.
// It exposes only the rule (type, value, minimum, eligible products), never
// the coupon's internal description or usage counters.
export async function POST(request) {
  try {
    const parsed = await readJsonBody(request, { maxBytes: MAX_BODY_BYTES });
    if (parsed.response) return parsed.response;
    const body = parsed.payload ?? {};
    const data = await lookupCartCoupon(body?.code, body?.productIds);
    return ok(data);
  } catch (error) {
    return failureFrom(error, {
      KnownError: CartError,
      fallbackMessage: "We couldn't check that code right now. Please try again.",
      label: "Cart coupon lookup",
    });
  }
}
