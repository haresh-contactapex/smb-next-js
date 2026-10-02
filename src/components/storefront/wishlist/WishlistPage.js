"use client";

import Link from "next/link";
import StoreIcon from "../icons";
import WishlistCard from "./WishlistCard";
import WishlistSkeleton from "./WishlistSkeleton";
import useWishlistProducts from "./useWishlistProducts";
import { useWishlist } from "./WishlistProvider";

// The saved items as a grid of cards. Guests see a nudge to sign in, because
// that is what makes the list follow them to other devices. `gridClassName`
// overrides the card grid for a narrower container (the account area's).
export default function WishlistPage({ gridClassName = "grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4" }) {
  const { items, hydrated, authenticated } = useWishlist();
  const { products, loading, failed, retry } = useWishlistProducts(items, hydrated);

  // The list is read from the browser / account after mount; don't flash "empty" before then.
  // A guest's items are known as soon as the page mounts, so size the placeholder to them.
  if (!hydrated) return <WishlistSkeleton cards={Math.min(items.length || 4, 8)} />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <StoreIcon name="heart" className="h-12 w-12 text-gray-300" />
        <p className="text-[16px] text-[#555555]">Your wishlist is empty. Tap the heart on any product to save it here.</p>
        <Link
          href="/women-wedding-bands"
          className="rounded bg-[#4A4A4A] px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#ef9822]"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  // Number the cards of each product instead of keying on product + variant:
  // that key changes when a color or size is switched, which would remount the
  // card and drop keyboard focus mid-edit.
  const seen = {};
  const cardKeys = items.map((item) => {
    seen[item.productId] = (seen[item.productId] ?? -1) + 1;
    return `${item.productId}-${seen[item.productId]}`;
  });

  return (
    <>
      <p role="status" className="mb-6 text-[14px] text-gray-500">
        {items.length} {items.length === 1 ? "item" : "items"} saved
      </p>

      {!authenticated && (
        <p className="mb-8 rounded border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-[14px] text-[#555555]">
          Your wishlist is saved on this device only.{" "}
          <Link href="/login" className="font-semibold text-[#333333] underline transition-colors hover:text-[#ef9822]">
            Sign in
          </Link>{" "}
          or{" "}
          <Link href="/register" className="font-semibold text-[#333333] underline transition-colors hover:text-[#ef9822]">
            create an account
          </Link>{" "}
          to keep it on every device.
        </p>
      )}

      {failed ? (
        <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center text-[14px]">
          <p>We couldn&apos;t load your saved items right now.</p>
          <button
            type="button"
            onClick={retry}
            className="rounded border border-gray-300 px-5 py-2 font-semibold text-[#333333] transition-colors hover:border-[#ef9822] hover:text-[#ef9822]"
          >
            Try again
          </button>
        </div>
      ) : (
        <ul className={`grid ${gridClassName}`}>
          {items.map((item, index) => (
            <li key={cardKeys[index]} className="min-w-0">
              <WishlistCard item={item} product={products[item.productId]} loading={loading} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
