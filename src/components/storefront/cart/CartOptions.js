"use client";

import { useId } from "react";
import StoreIcon from "../icons";
import CartNote from "./CartNote";
import CartShipping from "./CartShipping";
import CartCoupon from "./CartCoupon";
import { useCart } from "./CartProvider";

// The icon row under the item list. Each icon reveals its own section.
const OPTIONS = [
  { id: "note", label: "Order note", heading: "Add a note to your order", icon: "note" },
  { id: "shipping", label: "Shipping", heading: "Estimate shipping", icon: "truck" },
  { id: "coupon", label: "Coupon", heading: "Add a coupon code", icon: "tag" },
];

// Note / shipping / coupon icons and the section the active one opens. The
// parent owns `active` (an option id or null) so it can reset it, e.g. when
// the drawer closes. Shared by the drawer and the cart page.
export default function CartOptions({ active, onChange }) {
  const { note, shipping, coupon } = useCart();
  // The drawer and the cart page each render one of these, so ids must be per instance.
  const panelId = useId();
  const titleId = useId();
  const hasContent = { note: note.length > 0, shipping: Boolean(shipping), coupon: Boolean(coupon) };
  const open = OPTIONS.find((option) => option.id === active);

  return (
    <>
      <div className="flex divide-x divide-gray-100 border-b border-gray-100">
        {OPTIONS.map((option) => {
          const isActive = active === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(isActive ? null : option.id)}
              aria-expanded={isActive}
              aria-controls={isActive ? panelId : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium uppercase tracking-wider transition-colors hover:text-[#ef9822] ${
                isActive ? "bg-[#FFF8EE] text-[#ef9822]" : "text-[#555555]"
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
        <section id={panelId} aria-labelledby={titleId} className="border-b border-gray-100 bg-white px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 id={titleId} className="text-[15px] font-semibold text-[#333333]">
              {open.heading}
            </h3>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={`Close ${open.heading.toLowerCase()}`}
              className="text-gray-400 hover:text-[#ef9822] transition-colors"
            >
              <StoreIcon name="close" className="w-5 h-5" />
            </button>
          </div>
          {open.id === "note" && <CartNote onClose={() => onChange(null)} />}
          {open.id === "shipping" && <CartShipping />}
          {open.id === "coupon" && <CartCoupon />}
        </section>
      )}
    </>
  );
}
