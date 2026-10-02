"use client";

import StoreIcon from "../icons";
import { useWishlist } from "./WishlistProvider";
import { confirmWishlistRemoval } from "./wishlistHelpers";

// The heart toggle on product cards and the product page. It is filled when the
// product is on the wishlist, whichever color/size was saved; tapping an empty
// heart saves the product together with `variantId` (the product page passes its
// selected variant, a listing card has none), and tapping a filled one removes it
// once the shopper confirms. Disabled until the wishlist has loaded so an early
// tap can't be lost to the sign-in check.
export default function WishlistHeart({ productId, variantId = null, title, className = "", activeClassName = "" }) {
  const { hydrated, hasProduct, add, removeProduct } = useWishlist();
  const saved = hydrated && hasProduct(productId);

  function toggle() {
    if (!saved) {
      add(productId, variantId);
      return;
    }
    if (confirmWishlistRemoval(`"${title}"`)) removeProduct(productId);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!hydrated}
      aria-pressed={saved}
      aria-label={`Add ${title} to wishlist`}
      className={`${className} ${saved ? activeClassName : ""}`}
    >
      <StoreIcon name="heart" filled={saved} />
    </button>
  );
}
