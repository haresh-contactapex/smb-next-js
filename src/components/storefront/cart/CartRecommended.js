"use client";

import ProductCard from "../ProductCard";
import { useCart } from "./CartProvider";

const SHOWN_LIMIT = 4;

// "Recommended products" under the cart: the store's newest products that
// aren't already in the cart. The server can't see the cart (it lives in the
// browser), so it passes a few more than are shown and the cart filters here.
export default function CartRecommended({ products }) {
  const { items } = useCart();

  const inCart = new Set(items.map((item) => item.productId));
  const shown = products.filter((product) => !inCart.has(product.id)).slice(0, SHOWN_LIMIT);
  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="cart-recommended-heading" className="mt-16 border-t border-gray-100 pt-12">
      <h2
        id="cart-recommended-heading"
        className="mb-12 text-center text-[24px] font-normal text-[#333333] sm:text-[30px]"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        Recommended Products
      </h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((product, index) => (
          <ProductCard key={product.id} product={product} delay={index * 100} />
        ))}
      </div>
    </section>
  );
}
