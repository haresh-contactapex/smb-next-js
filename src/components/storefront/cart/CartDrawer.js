"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import StoreIcon from "../icons";
import CartLine from "./CartLine";
import CartNote from "./CartNote";
import CartShipping from "./CartShipping";
import CartCoupon from "./CartCoupon";
import { useCart } from "./CartProvider";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { formatCurrency } from "@/lib/currency";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// The icon row under the item list. Each icon reveals its own section.
const OPTIONS = [
  { id: "note", label: "Order note", heading: "Add a note to your order", icon: "note" },
  { id: "shipping", label: "Shipping", heading: "Estimate shipping", icon: "truck" },
  { id: "coupon", label: "Coupon", heading: "Add a coupon code", icon: "tag" },
];

function Row({ label, children, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "text-[16px] font-semibold text-[#333333]" : "text-[14px] text-[#555555]"}`}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// Slide-out cart from the right edge: the lines, then the note / shipping /
// coupon options, the running totals and checkout.
export default function CartDrawer() {
  const { items, count, note, coupon, shipping, totals, isOpen, closeCart } = useCart();
  const { currency } = useGeneralSettings();
  const [activeOption, setActiveOption] = useState(null);
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const returnFocusRef = useRef(null);
  const money = (amount) => formatCurrency(amount, currency);

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

  const hasContent = { note: note.length > 0, shipping: Boolean(shipping), coupon: Boolean(coupon) };
  const open = OPTIONS.find((option) => option.id === activeOption);
  const { effect, selectedRate } = totals;

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
              <div className="flex divide-x divide-gray-100 border-b border-gray-100">
                {OPTIONS.map((option) => {
                  const active = activeOption === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setActiveOption(active ? null : option.id)}
                      aria-expanded={active}
                      aria-controls={active ? "cart-option-panel" : undefined}
                      className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium uppercase tracking-wider transition-colors hover:text-[#ef9822] ${
                        active ? "bg-[#FFF8EE] text-[#ef9822]" : "text-[#555555]"
                      }`}
                    >
                      <StoreIcon name={option.icon} className="w-5 h-5" />
                      {option.label}
                      {hasContent[option.id] && (
                        <>
                          <span aria-hidden="true" className="absolute top-2.5 left-1/2 ml-3 h-2 w-2 rounded-full bg-[#ef9822]" />
                          <span className="sr-only">(added)</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {open && (
                <section id="cart-option-panel" aria-labelledby="cart-option-title" className="border-b border-gray-100 bg-white px-5 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 id="cart-option-title" className="text-[15px] font-semibold text-[#333333]">
                      {open.heading}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveOption(null)}
                      aria-label={`Close ${open.heading.toLowerCase()}`}
                      className="text-gray-400 hover:text-[#ef9822] transition-colors"
                    >
                      <StoreIcon name="close" className="w-5 h-5" />
                    </button>
                  </div>
                  {open.id === "note" && <CartNote onClose={() => setActiveOption(null)} />}
                  {open.id === "shipping" && <CartShipping />}
                  {open.id === "coupon" && <CartCoupon />}
                </section>
              )}

              <div className="px-5 py-4">
                <dl className="space-y-1.5">
                  <Row label="Subtotal">{money(totals.subtotal)}</Row>
                  {totals.discount > 0 && (
                    <Row label={`Discount (${coupon.code})`}>
                      <span className="text-success">−{money(totals.discount)}</span>
                    </Row>
                  )}
                  {selectedRate && (
                    <Row label={`Shipping (${selectedRate.label})`}>{selectedRate.price === 0 ? "Free" : money(selectedRate.price)}</Row>
                  )}
                  {(totals.discount > 0 || selectedRate) && (
                    <Row label={selectedRate ? "Estimated total" : "Total"} strong>
                      {money(totals.total)}
                    </Row>
                  )}
                </dl>
                {effect.freeShipping && !selectedRate && <p className="mt-2 text-[12px] text-success">{coupon.code} gives you free shipping.</p>}
                <p className="mt-2 text-[12px] text-gray-400">Taxes and final shipping are confirmed at checkout.</p>

                {/* Checkout isn't built on the storefront yet (Buy Now is inert for the same reason). */}
                <button
                  type="button"
                  disabled
                  title="Checkout is coming soon"
                  className="mt-4 w-full rounded bg-[#4A4A4A] py-3.5 text-[16px] font-semibold text-white transition-colors hover:bg-[#ef9822] disabled:opacity-50 disabled:pointer-events-none"
                >
                  Checkout
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
