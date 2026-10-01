"use client";

import StoreIcon from "../icons";
import { useWishlist } from "./WishlistProvider";

// The heart toggle on product cards and the product page. It is filled when the
// product is on the wishlist, whichever color/size was saved; tapping an empty
// heart saves the product together with `variantId` (the product page passes its
// selected variant, a listing card has none), and tapping a filled one removes it.
// Disabled until the wishlist has loaded so an early tap can't be lost to the
// sign-in check.
export default function WishlistHeart({ productId, variantId = null, title, className = "", activeClassName = "" }) {
  const { hydrated, hasProduct, add, removeProduct } = useWishlist();
  const saved = hydrated && hasProduct(productId);

  return (
    <button
      type="button"
      onClick={() => (saved ? removeProduct(productId) : add(productId, variantId))}
      disabled={!hydrated}
      aria-pressed={saved}
      aria-label={`Add ${title} to wishlist`}
      className={`${className} ${saved ? activeClassName : ""}`}
    >
      <StoreIcon name="heart" filled={saved} />
    </button>
  );
}
