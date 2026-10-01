import { getWishlistProducts, parseProductIds } from "@/lib/wishlist";
import { failure, ok } from "../respond";

// Public: the wishlist page's live product details (price, stock, rating,
// colors and sizes). Guests send the product ids from their browser; nothing
// here depends on who is asking.
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    return ok({ products: await getWishlistProducts(parseProductIds(body?.productIds)) });
  } catch (error) {
    return failure(error, "We couldn't load your wishlist details right now. Please try again.");
  }
}
