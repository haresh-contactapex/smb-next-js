import { mergeWishlistItems, parseWishlistRefs } from "@/lib/wishlist";
import { failure, ok, requireCustomer } from "../respond";

// Called right after sign-in / registration with the items the visitor saved as
// a guest. Returns the customer's whole list so the storefront can adopt it.
export async function POST(request) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    const body = await request.json().catch(() => ({}));
    return ok({ items: await mergeWishlistItems(customer.id, parseWishlistRefs(body?.items)) });
  } catch (error) {
    return failure(error, "We couldn't add your saved items to your account. Please try again.");
  }
}
