"use client";

import { useState } from "react";
import Link from "next/link";
import StoreIcon from "../icons";
import CartPageLine from "./CartPageLine";
import CartPageSkeleton from "./CartPageSkeleton";
import CartSummary from "./CartSummary";
import CartRecommended from "./CartRecommended";
import useCartProducts from "./useCartProducts";
import { useCart } from "./CartProvider";

// Full-page view of the same cart the drawer shows: the lines on the left,
// where each one's color and size can be changed in place, the order summary
// on the right, and a few recommended products underneath.
export default function CartPage({ recommended = [], pricesIncludeTax = null }) {
  const { items, hydrated, changeVariant } = useCart();
  const { products, failed, loading } = useCartProducts(items, hydrated);
  const [notice, setNotice] = useState("");

  // The cart is read from localStorage after mount; don't flash "empty" before then.
  if (!hydrated) return <CartPageSkeleton />;

  // A line's own key (product + variant) changes when its color or size does,
  // which would remount it and drop keyboard focus mid-edit. Number the lines
  // of each product instead: that holds steady while a variant is switched.
  const seen = {};
  const lineKeys = items.map((item) => {
    seen[item.productId] = (seen[item.productId] ?? -1) + 1;
    return `${item.productId}-${seen[item.productId]}`;
  });

  function switchVariant(item, variant) {
    const duplicate = items.some((other) => other.key !== item.key && other.productId === item.productId && other.variantId === variant.id);
    setNotice(duplicate ? `${item.title} now matches another line in your cart, so the two were combined.` : "");
    changeVariant(item.key, variant);
  }

  return (
    <>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <StoreIcon name="bag" className="w-12 h-12 text-gray-300" />
          <p className="text-[16px] text-[#555555]">Your cart is empty.</p>
          <Link
            href="/women-wedding-bands"
            className="rounded bg-[#4A4A4A] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#ef9822] transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_420px] xl:gap-16">
          <div>
            <ul className="divide-y divide-gray-300 border-b border-gray-300">
              {items.map((item, index) => (
                <CartPageLine
                  key={lineKeys[index]}
                  item={item}
                  product={products[item.productId]}
                  loading={loading}
                  onVariantChange={switchVariant}
                />
              ))}
            </ul>
            <p role="status" className={`text-[13px] text-gray-500 ${notice || failed ? "mt-4" : ""}`}>
              {notice || (failed ? "We couldn't load the other colors and sizes right now. Refresh the page to try again." : "")}
            </p>
          </div>

          <CartSummary pricesIncludeTax={pricesIncludeTax} />
        </div>
      )}

      <CartRecommended products={recommended} />
    </>
  );
}
