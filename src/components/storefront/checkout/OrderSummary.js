"use client";

import Link from "next/link";
import StoreIcon from "../icons";
import CheckoutPromo from "./CheckoutPromo";
import { useCart } from "../cart/CartProvider";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { formatCurrency } from "@/lib/currency";
import { CHECKOUT_CARD } from "./checkoutStyles";
import { lineDetails } from "./checkoutHelpers";
import { round2 } from "../cart/cartHelpers";

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[16px] text-[#555555]">
      <dt className="flex items-center gap-1.5">{label}</dt>
      <dd className="text-right font-medium text-[#222222]">{children}</dd>
    </div>
  );
}

// The "Estimated Tax" info icon: the sentence appears on hover and keyboard focus.
function TaxInfo({ children }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="How tax is estimated"
        aria-describedby="checkout-tax-info"
        className="rounded-full text-[#777777] transition-colors hover:text-[#EF9822] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#EF9822]"
      >
        <StoreIcon name="info" className="h-5 w-5" />
      </button>
      <span
        id="checkout-tax-info"
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg bg-[#333333] px-3 py-2 text-[12px] leading-snug text-white opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {children}
      </span>
    </span>
  );
}

const money = (amount, currency) => formatCurrency(amount, currency);

// The reassurance block at the foot of the summary. The wording mirrors the
// announcement bar; the free-shipping threshold is the store's real one once
// the destination is known.
function Assurances({ shipping, currency }) {
  const threshold = shipping?.freeShippingThreshold > 0 ? shipping.freeShippingThreshold : 0;
  const items = [
    { icon: "truck", title: "Free Shipping", text: threshold ? `On orders over ${money(threshold, currency)}` : "Free shipping to the US" },
    { icon: "undo", title: "Easy Returns", text: "30-day return policy" },
    { icon: "shieldCheck", title: "Secure Checkout", text: "Your information is protected" },
  ];
  return (
    <ul className="mt-7 space-y-5 rounded-xl bg-[#FCF9F3] p-5 sm:p-6">
      {items.map((item) => (
        <li key={item.title} className="flex items-center gap-4">
          <StoreIcon name={item.icon} className="h-8 w-8 flex-shrink-0 text-[#333333] [stroke-width:1.25]" />
          <p>
            <span className="block text-[15px] font-semibold text-[#222222]">{item.title}</span>
            <span className="block text-[14px] text-[#777777]">{item.text}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

// The order summary beside the checkout: the cart's lines, the promo code, and
// subtotal / shipping / tax / total. `checkout` is checkoutTotals() (tax and the
// total with tax); the lines, discount and shipping come straight from the cart.
export default function OrderSummary({ checkout, tax }) {
  const { items, count, coupon, shipping, totals } = useCart();
  const { currency } = useGeneralSettings();
  const { selectedRate } = totals;

  return (
    <aside aria-label="Order summary" className={`${CHECKOUT_CARD} p-6 sm:p-8 lg:sticky lg:top-6`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[22px] font-bold text-[#111111] sm:text-[24px]">Order Summary</h2>
        <Link href="/cart" className="flex-shrink-0 text-[14px] text-[#555555] underline transition-colors hover:text-[#EF9822]">
          Edit Cart
        </Link>
      </div>

      <ul className="mt-6 space-y-5">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-4">
            <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-[#F5F3EF] p-2">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className="h-full w-full object-contain mix-blend-multiply" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-[10px] text-gray-400">No image</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold leading-snug text-[#222222]">{item.title}</p>
              {lineDetails(item).length > 0 && (
                <p className="mt-1 text-[14px] text-[#777777]">
                  {lineDetails(item).map((detail, index) => (
                    <span key={`${index}-${detail}`} className="whitespace-nowrap">
                      {index > 0 && " • "}
                      {detail}
                    </span>
                  ))}
                </p>
              )}
              <p className="mt-1.5 text-[14px] text-[#777777]">Qty: {item.quantity}</p>
            </div>
            <p className="flex-shrink-0 text-[16px] font-semibold text-[#222222]">{money(round2(item.price * item.quantity), currency)}</p>
          </li>
        ))}
      </ul>

      <hr className="my-6 border-[#EEEEEE]" />
      <CheckoutPromo />

      <dl className="mt-6 space-y-4">
        <Row label={`Subtotal (${count} ${count === 1 ? "item" : "items"})`}>{money(totals.subtotal, currency)}</Row>
        {totals.discount > 0 && (
          <Row label={`Discount (${coupon.code})`}>
            <span className="text-success">−{money(totals.discount, currency)}</span>
          </Row>
        )}
        <Row label="Shipping">
          {selectedRate ? (
            selectedRate.price === 0 ? (
              <span className="uppercase">Free</span>
            ) : (
              money(selectedRate.price, currency)
            )
          ) : (
            <span className="text-[14px] font-normal text-[#9A9A9A]">Added at billing</span>
          )}
        </Row>
        <Row
          label={
            <>
              Estimated Tax
              <TaxInfo>
                {checkout.taxIncluded
                  ? "Your prices already include tax."
                  : tax
                    ? `Estimated at the store's ${tax.rate}% tax rate. The final amount is confirmed when you place your order.`
                    : "Tax is confirmed when you place your order."}
              </TaxInfo>
            </>
          }
        >
          {checkout.taxIncluded ? "Included" : checkout.tax === null ? "—" : money(checkout.tax, currency)}
        </Row>
      </dl>

      <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-[#EEEEEE] pt-6">
        <span className="text-[22px] font-bold text-[#111111] sm:text-[24px]">Total</span>
        <span className="text-[24px] font-bold text-[#111111] sm:text-[26px]" aria-live="polite">
          {money(checkout.total, currency)}
        </span>
      </div>

      <Assurances shipping={shipping} currency={currency} />
    </aside>
  );
}
