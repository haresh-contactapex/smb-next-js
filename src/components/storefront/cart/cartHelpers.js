// Moved to src/lib/shared so server code does not import from components/.
// Kept so existing component imports keep working.
export * from "@/lib/shared/cart";

// Browser-only, so it stays with the components rather than in src/lib/shared.
import { CART_STORAGE_KEY, EMPTY_CART, sanitizeCart } from "@/lib/shared/cart";

export function readStoredCart() {
  try {
    return sanitizeCart(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "null"));
  } catch {
    return EMPTY_CART;
  }
}
