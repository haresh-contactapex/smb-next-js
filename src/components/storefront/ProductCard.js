"use client";

import Link from "next/link";
import StoreIcon from "./icons";
import WishlistHeart from "./wishlist/WishlistHeart";
import { useCart } from "./cart/CartProvider";
import useImageLoaded from "./useImageLoaded";
import { formatCurrency } from "@/lib/currency";

// Round white button in the image's bottom-right corner. Hidden until the card is
// hovered or something inside it has keyboard focus; touch screens have no hover,
// so it is always shown there.
const CART_CONTROL =
  "absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#333333] shadow-md " +
  "hover:bg-[#ef9822] hover:text-white focus-visible:bg-[#ef9822] focus-visible:text-white transition duration-300 " +
  "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 focus-visible:opacity-100 focus-visible:translate-y-0 " +
  "[@media(hover:none)]:opacity-100 [@media(hover:none)]:translate-y-0";

const LAYER = "absolute inset-0 flex items-center justify-center p-6 sm:p-8 transform transition-all duration-700 ease-out z-10";

// Listing / recently-viewed card. The title link is stretched over the whole
// card (after:absolute) so the wishlist and cart controls can stay real sibling
// controls instead of being nested inside an anchor.
//
// The cart control depends on the product: a simple product is added to the cart
// straight away (opening the cart drawer), while one with variants (color, size)
// links to its page so the shopper can choose. A product without `hasVariants`
// (an older recently-viewed entry) can't be told apart, so it also links.
export default function ProductCard({ product, currency, delay = 0 }) {
  const { loaded, imageProps } = useImageLoaded();
  const { addItem } = useCart();
  const addsDirectly = product.hasVariants === false;

  function addToCart() {
    addItem({
      productId: product.id,
      variantId: null,
      handle: product.handle,
      title: product.title,
      image: product.image,
      options: {},
      sku: product.sku || "",
      price: product.price,
      compareAtPrice: product.compareAtPrice > product.price ? product.compareAtPrice : null,
      maxQuantity: null,
    });
  }

  return (
    <div className="group relative fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative bg-[#FAFAFA] rounded-md aspect-square overflow-hidden mb-3 sm:mb-4">
        <WishlistHeart
          productId={product.id}
          title={product.title}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 hover:text-[#ef9822] transition-colors z-20"
          activeClassName="text-[#ef9822]"
        />
        {addsDirectly ? (
          <button type="button" onClick={addToCart} aria-label={`Add ${product.title} to cart`} title="Add to cart" className={CART_CONTROL}>
            <StoreIcon name="bag" />
          </button>
        ) : (
          <Link href={`/products/${product.handle}`} aria-label={`Choose options for ${product.title}`} title="Choose options" className={CART_CONTROL}>
            <StoreIcon name="bag" />
          </Link>
        )}
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
