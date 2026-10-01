"use client";

import StoreIcon from "../icons";
import { useCart } from "./CartProvider";

// Header cart icon: opens the cart drawer and shows how many items are in it.
export default function CartButton({ className = "" }) {
  const { count, isOpen, openCart } = useCart();
  const label = count > 0 ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart";

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      className={`relative ${className}`}
    >
      <StoreIcon name="bag" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ef9822] text-white text-[10px] font-semibold leading-[18px] text-center"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
