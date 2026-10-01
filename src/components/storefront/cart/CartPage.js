"use client";

import { useState } from "react";
import Link from "next/link";
import StoreIcon from "../icons";
import CartLine from "./CartLine";
import CartOptions from "./CartOptions";
import CartTotals from "./CartTotals";
import CartCheckoutButton from "./CartCheckoutButton";
import { useCart } from "./CartProvider";

// Full-page view of the same cart the drawer shows: the lines on the left,
// and on the right the note / shipping / coupon options, totals and checkout.
export default function CartPage() {
  const { items, hydrated } = useCart();
  const [activeOption, setActiveOption] = useState(null);

  // The cart is read from localStorage after mount; don't flash "empty" before then.
  if (!hydrated) return <div className="min-h-[40vh]" aria-busy="true" />;

  if (items.length === 0) {
    return (
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
    );
  }

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
      <ul className="divide-y divide-gray-100 border-y border-gray-100">
        {items.map((item) => (
          <CartLine key={item.key} item={item} />
        ))}
      </ul>

      <aside aria-label="Order summary" className="overflow-hidden rounded border border-gray-200">
        <CartOptions active={activeOption} onChange={setActiveOption} />
        <div className="px-5 py-4">
          <CartTotals />
          <div className="mt-4">
            <CartCheckoutButton />
          </div>
        </div>
      </aside>
    </div>
  );
}
