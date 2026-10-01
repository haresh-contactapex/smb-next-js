import { getCurrentCustomer } from "@/lib/auth/customerSession";
import {
  addWishlistItem,
  listWishlist,
  parseWishlistRef,
  removeWishlistItem,
  removeWishlistProduct,
  replaceWishlistVariant,
} from "@/lib/wishlist";
import { failure, ok, requireCustomer } from "./respond";

// Signed-in customers' wishlists live in the database, so every handler here
// checks the customer session itself (middleware does not cover /api).

// Always succeeds for a guest so the storefront can tell the two apart in one call.
export async function GET() {
  try {
    const customer = await getCurrentCustomer();
    if (!customer) return ok({ authenticated: false, items: [] });
    return ok({ authenticated: true, items: await listWishlist(customer.id) });
  } catch (error) {
    return failure(error, "We couldn't load your wishlist right now. Please try again.");
  }
}

export async function POST(request) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    const body = await request.json().catch(() => ({}));
    await addWishlistItem(customer.id, parseWishlistRef(body));
    return ok({ saved: true });
  } catch (error) {
    return failure(error, "We couldn't save that to your wishlist. Please try again.");
  }
}

// { productId, variantId } removes that entry; { productId, allVariants: true } every entry for the product.
export async function DELETE(request) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    const body = await request.json().catch(() => ({}));
    const ref = parseWishlistRef(body);
    if (body?.allVariants === true) await removeWishlistProduct(customer.id, ref.productId);
    else await removeWishlistItem(customer.id, ref);
    return ok({ removed: true });
  } catch (error) {
    return failure(error, "We couldn't remove that from your wishlist. Please try again.");
  }
}

// { productId, variantId, toVariantId }: the customer picked another color/size on the wishlist page.
export async function PATCH(request) {
  const { customer, response } = await requireCustomer();
  if (response) return response;
  try {
    const body = await request.json().catch(() => ({}));
    await replaceWishlistVariant(customer.id, parseWishlistRef(body), body?.toVariantId);
    return ok({ updated: true });
  } catch (error) {
    return failure(error, "We couldn't update your wishlist. Please try again.");
  }
}
