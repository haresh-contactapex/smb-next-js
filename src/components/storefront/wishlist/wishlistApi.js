import { requestJson } from "../cart/cartApi";
import { clearStoredWishlist, readStoredWishlist } from "./wishlistHelpers";

// Moves the items this browser saved as a guest into the signed-in customer's
// account. Called by the login and registration forms right after the session
// cookie is set, and by the storefront when it finds a session it didn't
// create. The browser copy is cleared only once the server has the items, so a
// failed attempt loses nothing and is retried on the next storefront load.
// Never throws; resolves to { merged } (how many items were sent).
export async function mergeGuestWishlist() {
  const guest = readStoredWishlist();
  if (guest.length === 0) return { merged: 0 };

  const result = await requestJson("POST", "/api/wishlist/merge", {
    items: guest.map(({ productId, variantId }) => ({ productId, variantId })),
  });
  if (!result.ok) return { merged: 0, error: result.error };

  clearStoredWishlist();
  return { merged: guest.length, items: result.data?.items };
}
