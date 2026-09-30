"use client";

import Link from "next/link";
import StoreIcon from "./icons";
import useImageLoaded from "./useImageLoaded";
import { formatCurrency } from "@/lib/currency";

const LAYER = "absolute inset-0 flex items-center justify-center p-6 sm:p-8 transform transition-all duration-700 ease-out z-10";

// Listing / recently-viewed card. The title link is stretched over the whole
// card (after:absolute) so the wishlist button can stay a real sibling button
// instead of being nested inside an anchor.
export default function ProductCard({ product, currency, delay = 0 }) {
  const { loaded, imageProps } = useImageLoaded();

  return (
    <div className="group relative fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative bg-[#FAFAFA] rounded-md aspect-square overflow-hidden mb-3 sm:mb-4">
        <button type="button" aria-label="Add to wishlist" className="absolute top-3 right-3 sm:top-4 sm:right-4 hover:text-[#ef9822] transition-colors z-20">
          <StoreIcon name="heart" />
        </button>
        {product.image ? (
          <>
            {/* Hover image */}
            <div className={`${LAYER} bg-[#FAFAFA] opacity-0 group-hover:opacity-100 scale-110 group-hover:scale-100`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.hoverImage || product.image} alt="" className="object-contain mix-blend-multiply w-[90%] h-[90%]" />
            </div>
            {/* Base image */}
            <div className={`${LAYER} ${loaded ? "bg-[#FAFAFA]" : "shimmer"} group-hover:opacity-0 group-hover:scale-95`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                {...imageProps}
                src={product.image}
                alt={product.title}
                className={`object-contain mix-blend-multiply w-[90%] h-[90%] transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">No image</div>
        )}
      </div>
      <div className="text-left">
        <div className="font-semibold text-[#333333] mb-1">{formatCurrency(product.price, currency)}</div>
        <h3 className="leading-tight text-sm font-[600]">
          <Link
            href={`/products/${product.handle}`}
            className="after:absolute after:inset-0 after:z-[15] hover:text-[#ef9822] transition-colors"
          >
            {product.title}
          </Link>
        </h3>
      </div>
    </div>
  );
}
