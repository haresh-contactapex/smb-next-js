"use client";

import { useCart } from "./CartProvider";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";

function Row({ label, children, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "text-[16px] font-semibold text-[#333333]" : "text-[14px] text-[#555555]"}`}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// Subtotal, discount, the chosen shipping estimate and the running total.
// Shared by the drawer and the cart page.
export default function CartTotals() {
  const { coupon, totals } = useCart();
  const { formatMoney } = useGeneralSettings();
  const { effect, selectedRate } = totals;
  const money = formatMoney;

  return (
    <>
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
    </>
  );
}
