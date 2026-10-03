"use client";

import { useId, useRef, useState } from "react";
import { useCart } from "../cart/CartProvider";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { CHECKOUT_FIELD, CHECKOUT_FIELD_ERROR } from "./checkoutStyles";

// The summary's promo code field. It applies the same discount codes as the
// cart (Vouchers / Coupons) through the cart's own applyCoupon(), so a code
// entered on either page shows on the other.
export default function CheckoutPromo() {
  const { coupon, couponNotice, totals, applyCoupon, removeCoupon } = useCart();
  const { formatMoney } = useGeneralSettings();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);
  const fieldId = useId();
  const errorId = useId();
  const { effect } = totals;

  async function submit(event) {
    event.preventDefault();
    if (applyingRef.current) return;
    if (!code.trim()) {
      setError("Enter a promo code.");
      return;
    }

    applyingRef.current = true;
    setApplying(true);
    setError("");
    const result = await applyCoupon(code);
    applyingRef.current = false;
    setApplying(false);

    if (result.ok) setCode("");
    else setError(result.error);
  }

  const status =
    coupon && effect.shortfall > 0
      ? `Spend ${formatMoney(effect.shortfall)} more to use ${coupon.code}.`
      : coupon && effect.noEligibleItems
        ? `${coupon.code} doesn't apply to the items in your cart.`
        : couponNotice;

  return (
    <div>
      {coupon && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[#EF9822]/40 bg-[#FCF9F3] px-3.5 py-2.5 text-[14px]">
          <p className="min-w-0 truncate">
            <span className="font-semibold text-[#333333]">{coupon.code}</span>
            <span className="text-[#777777]"> applied</span>
          </p>
          <button
            type="button"
            onClick={removeCoupon}
            aria-label={`Remove promo code ${coupon.code}`}
            className="flex-shrink-0 font-medium text-[#777777] underline transition-colors hover:text-[#EF9822]"
          >
            Remove
          </button>
        </div>
      )}

      <p role="status" className="mb-3 text-[13px] text-[#777777] empty:hidden">
        {status}
      </p>

      <form onSubmit={submit} noValidate>
        <label htmlFor={fieldId} className="sr-only">
          Promo code
        </label>
        <div className="flex gap-3">
          <input
            id={fieldId}
            type="text"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              if (error) setError("");
            }}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={30}
            placeholder="Enter promo code"
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`${CHECKOUT_FIELD} min-w-0 flex-1 uppercase placeholder:normal-case ${error ? CHECKOUT_FIELD_ERROR : ""}`}
          />
          <button
            type="submit"
            disabled={applying}
            className="flex-shrink-0 rounded-lg bg-[#FEF1DD] px-6 text-[15px] font-semibold text-[#8A5000] transition-colors hover:bg-[#FCE5C2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EF9822] disabled:pointer-events-none disabled:opacity-60"
          >
            {applying ? "Applying…" : "Apply"}
          </button>
        </div>
        <p id={errorId} role="alert" className="mt-1.5 text-[13px] text-error empty:hidden">
          {error}
        </p>
      </form>
    </div>
  );
}
