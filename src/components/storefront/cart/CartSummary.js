"use client";

import { useState } from "react";
import CartOptions from "./CartOptions";
import CartCheckoutButton from "./CartCheckoutButton";
import EngravingLines from "../engraving/EngravingLines";
import { useCart } from "./CartProvider";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { round2 } from "./cartHelpers";

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[13px] uppercase text-[#555555]">
      <dt>{label}</dt>
      <dd className="flex-shrink-0 text-right normal-case">{children}</dd>
    </div>
  );
}

// The cart page's order summary: what each line costs, the note / shipping /
// coupon options, discount, shipping and tax rows, the total and checkout.
// `pricesIncludeTax` comes from Settings -> Currency & Tax; null when unknown.
export default function CartSummary({ pricesIncludeTax = null }) {
  const { items, coupon, totals } = useCart();
  const { formatMoney } = useGeneralSettings();
  const [activeOption, setActiveOption] = useState(null);
  const money = formatMoney;
  const { effect, selectedRate } = totals;

  return (
    <aside aria-label="Order summary" className="rounded bg-[#F8F8F8] p-6 sm:p-8 lg:sticky lg:top-28">
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.key} className="flex items-baseline justify-between gap-4 text-[13px] uppercase text-[#555555]">
            <span className="min-w-0">
              {item.title}
              {item.quantity > 1 && <span className="ml-1.5 text-gray-400">× {item.quantity}</span>}
              <EngravingLines engraving={item.engraving} className="mt-0.5 text-[12px] normal-case text-gray-400" />
            </span>
            <span className="flex-shrink-0 normal-case">{money(round2(item.price * item.quantity))}</span>
          </li>
        ))}
      </ul>

      <div className="my-5 overflow-hidden rounded border border-gray-200 bg-white">
        <CartOptions active={activeOption} onChange={setActiveOption} />
      </div>

      <dl className="space-y-3 border-t border-gray-300 pt-5">
        {(totals.discount > 0 || selectedRate) && <Row label="Subtotal">{money(totals.subtotal)}</Row>}
        {totals.discount > 0 && (
          <Row label={`Discount (${coupon.code})`}>
            <span className="text-success">−{money(totals.discount)}</span>
          </Row>
        )}
        {selectedRate && (
          <Row label={`Shipping (${selectedRate.label})`}>{selectedRate.price === 0 ? "Free" : money(selectedRate.price)}</Row>
        )}
        <Row label="Sales tax">{pricesIncludeTax ? "Included" : "Calculated at checkout"}</Row>
      </dl>

      <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-gray-300 pt-5 text-[#333333]">
        <span className="text-[13px] font-bold uppercase tracking-wider">{selectedRate ? "Estimated total" : "Total"}</span>
        <span className="text-[18px] font-bold" aria-live="polite">
          {money(totals.total)}
        </span>
      </div>

      <div className="mt-6">
        <CartCheckoutButton label="Proceed to checkout" className="uppercase tracking-wider" />
      </div>

      {!selectedRate && (
        <p className="mt-3 text-[12px] text-gray-400">
          {effect.freeShipping ? `${coupon.code} gives you free shipping. ` : ""}Shipping is calculated at checkout.
        </p>
      )}
    </aside>
  );
}
