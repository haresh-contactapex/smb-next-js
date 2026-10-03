"use client";

import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import StripePaymentForm from "./StripePaymentForm";
import { CHECKOUT_BUTTON } from "./checkoutStyles";

// Step 3: pick one of the payment methods the store has enabled in Settings ->
// Payment. Cash on delivery has a minimum order, so it is offered but disabled
// below it, and the card is disabled when Stripe's keys aren't set up.
//
// Paying by card is live: choosing it shows Stripe's card form and Place Order
// (StripePaymentForm). The other methods can't take an order yet, so for them the
// final button stays disabled. `active` is whether this step is the open one, so the
// card form is only loaded once the customer gets here; `buildOrder()` is the request
// the server prices and saves.
export default function PaymentStep({ methods, selected, onSelect, orderTotal, active, buildOrder }) {
  const { formatMoney } = useGeneralSettings();

  if (methods.length === 0) {
    return (
      <p role="status" className="rounded-lg bg-[#FCF9F3] px-4 py-3.5 text-[15px] text-[#555555]">
        No payment methods are available right now. Please check back soon.
      </p>
    );
  }

  const chosen = methods.find((method) => method.id === selected);

  return (
    <div>
      <fieldset>
        <legend className="sr-only">Payment method</legend>
        <div className="space-y-3">
          {methods.map((method) => {
            const belowMinimum = method.minOrder > 0 && orderTotal < method.minOrder;
            const disabled = belowMinimum || Boolean(method.unavailable);
            const checked = selected === method.id;
            return (
              <label
                key={method.id}
                className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                  disabled
                    ? "cursor-not-allowed border-[#EEEEEE] opacity-60"
                    : checked
                      ? "cursor-pointer border-[#EF9822] bg-[#FCF9F3]"
                      : "cursor-pointer border-[#E4E4E4] hover:border-[#EF9822]/60"
                }`}
              >
                <input
                  type="radio"
                  name="checkout-payment-method"
                  value={method.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onSelect(method.id)}
                  className="mt-1 h-[18px] w-[18px] flex-shrink-0 accent-[#EF9822]"
                />
                <span>
                  <span className="block text-[16px] font-semibold text-[#222222]">{method.label}</span>
                  <span className="mt-0.5 block text-[14px] text-[#777777]">
                    {method.unavailable || (belowMinimum ? `Available on orders of ${formatMoney(method.minOrder)} or more.` : method.detail)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {chosen?.id === "card" && chosen.stripe ? (
        <StripePaymentForm stripe={chosen.stripe} active={active} total={orderTotal} buildOrder={buildOrder} />
      ) : (
        <>
          <button type="button" disabled className={`${CHECKOUT_BUTTON} mt-7`}>
            Place Order
          </button>
          <p className="mt-3 text-center text-[13px] text-[#9A9A9A]">Orders can&apos;t be placed with this payment method yet.</p>
        </>
      )}
    </div>
  );
}
