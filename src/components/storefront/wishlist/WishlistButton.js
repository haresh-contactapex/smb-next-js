"use client";

import Link from "next/link";
import StoreIcon from "../icons";
import { useWishlist } from "./WishlistProvider";

// Header heart icon: links to the wishlist page and shows how many items are
// saved. The count follows adds and removes anywhere on the storefront.
export default function WishlistButton({ className = "" }) {
  const { count, hydrated } = useWishlist();
  const shown = hydrated ? count : 0;
  const label = shown > 0 ? `Wishlist, ${shown} ${shown === 1 ? "item" : "items"}` : "Wishlist";

  return (
    <Link href="/wishlist" aria-label={label} className={`relative ${className}`}>
      <StoreIcon name="heart" />
      {shown > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ef9822] text-white text-[10px] font-semibold leading-[18px] text-center"
        >
          {shown > 99 ? "99+" : shown}
        </span>
      )}
    </Link>
  );
}
