"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import StoreIcon from "../icons";
import CartLine from "./CartLine";
import CartOptions from "./CartOptions";
import CartTotals from "./CartTotals";
import CartCheckoutButton from "./CartCheckoutButton";
import { useCart } from "./CartProvider";
import { CART_SECONDARY_BUTTON } from "./cartStyles";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Slide-out cart from the right edge: the lines, then the note / shipping /
// coupon options, the running totals, View Cart and Checkout.
export default function CartDrawer() {
  const { items, count, isOpen, closeCart } = useCart();
  const [activeOption, setActiveOption] = useState(null);
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveOption(null);
      return undefined;
    }

    returnFocusRef.current = document.activeElement;
    // Wait a frame: the closed drawer is visibility:hidden until its transition starts, and hidden elements can't take focus.
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus({ preventScroll: true }));
    document.body.style.overflow = "hidden";

    const onKey = (event) => {
      if (event.key === "Escape") {
        closeCart();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      // Keep Tab inside the drawer while it is modal.
      const focusable = [...drawerRef.current.querySelectorAll(FOCUSABLE)];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!drawerRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      const target = returnFocusRef.current;
      if (target instanceof HTMLElement && document.contains(target)) target.focus({ preventScroll: true });
    };
  }, [isOpen, closeCart]);

  return (
    <>
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-hidden="true"
      />

      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className={`fixed top-0 right-0 z-[70] flex h-full w-full max-w-[440px] flex-col bg-white shadow-2xl transition-[transform,visibility] duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full invisible"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="cart-drawer-title" className="text-[20px] font-normal text-[#333333]" style={{ fontFamily: "var(--font-playfair), serif" }}>
            Shopping Cart{count > 0 && <span className="ml-1.5 text-[14px] text-gray-400">({count})</span>}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="rounded-full p-2 hover:bg-gray-50 hover:text-[#ef9822] transition-colors"
          >
            <StoreIcon name="close" className="w-6 h-6" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <StoreIcon name="bag" className="w-12 h-12 text-gray-300" />
            <p className="text-[16px] text-[#555555]">Your cart is empty.</p>
            <Link
              href="/women-wedding-bands"
              onClick={closeCart}
              className="rounded bg-[#4A4A4A] px-6 py-3 text-[14px] font-semibold text-white hover:bg-[#ef9822] transition-colors"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="min-h-[120px] flex-1 divide-y divide-gray-100 overflow-y-auto overflow-x-hidden px-5">
              {items.map((item) => (
                <CartLine key={item.key} item={item} />
              ))}
            </ul>

            <div className="max-h-[70%] flex-shrink-0 overflow-y-auto border-t border-gray-200 bg-white">
              <CartOptions active={activeOption} onChange={setActiveOption} />

              <div className="px-5 py-4">
                <CartTotals />
                <div className="mt-4 space-y-2.5">
                  <Link href="/cart" onClick={closeCart} className={`${CART_SECONDARY_BUTTON} block w-full !py-3.5 text-center !text-[16px]`}>
                    View Cart
                  </Link>
                  <CartCheckoutButton />
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
