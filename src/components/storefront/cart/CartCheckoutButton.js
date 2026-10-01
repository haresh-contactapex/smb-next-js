"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

// Goes to the checkout page. The drawer is mounted in the layout and stays
// open across navigation, so it is closed on the way out.
export default function CartCheckoutButton({ label = "Checkout", className = "" }) {
  const { closeCart } = useCart();

  return (
    <Link
      href="/checkout"
      onClick={closeCart}
      className={`block w-full rounded bg-[#4A4A4A] py-3.5 text-center text-[16px] font-semibold text-white transition-colors hover:bg-[#ef9822] ${className}`}
    >
      {label}
    </Link>
  );
}
