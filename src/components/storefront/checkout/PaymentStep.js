"use client";

import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { formatCurrency } from "@/lib/currency";
import { CHECKOUT_BUTTON } from "./checkoutStyles";

// Step 3: pick one of the payment methods the store has enabled in Settings ->
// Payment. Cash on delivery has a minimum order, so it is offered but disabled
// below it. Taking the payment and creating the order isn't built yet, which is
// why the final button stays disabled.
export default function PaymentStep({ methods, selected, onSelect, orderTotal }) {
  const { currency } = useGeneralSettings();

  if (methods.length === 0) {
    return (
      <p role="status" className="rounded-lg bg-[#FCF9F3] px-4 py-3.5 text-[15px] text-[#555555]">
        No payment methods are available right now. Please check back soon.
      </p>
    );
  }

  return (
    <div>
      <fieldset>
        <legend className="sr-only">Payment method</legend>
        <div className="space-y-3">
          {methods.map((method) => {
            const belowMinimum = method.minOrder > 0 && orderTotal < method.minOrder;
            const checked = selected === method.id;
            return (
              <label
                key={method.id}
                className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                  belowMinimum
                    ? "cursor-not-allowed border-[#EEEEEE] opacity-60"
                    : checked
                      ? "cursor-pointer border-[#AF8C5A] bg-[#FCF9F3]"
                      : "cursor-pointer border-[#E4E4E4] hover:border-[#AF8C5A]/60"
                }`}
              >
                <input
                  type="radio"
                  name="checkout-payment-method"
                  value={method.id}
                  checked={checked}
                  disabled={belowMinimum}
                  onChange={() => onSelect(method.id)}
                  className="mt-1 h-[18px] w-[18px] flex-shrink-0 accent-[#AF8C5A]"
                />
                <span>
                  <span className="block text-[16px] font-semibold text-[#222222]">{method.label}</span>
                  <span className="mt-0.5 block text-[14px] text-[#777777]">
                    {belowMinimum ? `Available on orders of ${formatCurrency(method.minOrder, currency)} or more.` : method.detail}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <button type="button" disabled className={`${CHECKOUT_BUTTON} mt-7`}>
        Place Order
      </button>
      <p className="mt-3 text-center text-[13px] text-[#9A9A9A]">Placing orders isn&apos;t available yet.</p>
    </div>
  );
}
