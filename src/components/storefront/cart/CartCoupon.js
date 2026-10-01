"use client";

import { useId, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { formatCurrency } from "@/lib/currency";
import { CART_FIELD, CART_LABEL, CART_PRIMARY_BUTTON } from "./cartStyles";

function describeCoupon(coupon, currency) {
  if (coupon.type === "percentage") return `${coupon.value}% off`;
  if (coupon.type === "fixed") return `${formatCurrency(coupon.value, currency)} off`;
  return "Free shipping";
}

// "Add a coupon code": checks the code against the store's coupons and applies
// it to the cart. Only one code is active at a time; applying another replaces it.
export default function CartCoupon() {
  const { coupon, couponNotice, totals, applyCoupon, removeCoupon } = useCart();
  const { currency } = useGeneralSettings();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);
  const fieldId = useId();
  const errorId = useId();

  async function submit(event) {
    event.preventDefault();
    if (applyingRef.current) return;
    if (!code.trim()) {
      setError("Enter a discount code.");
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

  const { effect } = totals;

  return (
    <div>
      {coupon && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded border border-[#ef9822]/40 bg-[#FFF8EE] px-3 py-2 text-[13px]">
          <p>
            <span className="font-semibold text-[#333333]">{coupon.code}</span>
            <span className="text-[#555555]"> · {describeCoupon(coupon, currency)}</span>
          </p>
          <button
            type="button"
            onClick={removeCoupon}
            aria-label={`Remove discount code ${coupon.code}`}
            className="font-medium text-gray-500 underline hover:text-[#ef9822] transition-colors"
          >
            Remove
          </button>
        </div>
      )}

      <p role="status" className="text-[12px] text-[#555555] empty:hidden mb-3">
        {coupon && effect.shortfall > 0
          ? `Spend ${formatCurrency(effect.shortfall, currency)} more to use ${coupon.code}.`
          : coupon && effect.noEligibleItems
            ? `${coupon.code} doesn't apply to the items in your cart.`
            : couponNotice}
      </p>

      <form onSubmit={submit} noValidate>
        <label htmlFor={fieldId} className={CART_LABEL}>
          Discount code
        </label>
        <div className="flex gap-2">
          <input
            id={fieldId}
            type="text"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              if (error) setError("");
            }}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={30}
            placeholder="Enter your code"
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`${CART_FIELD} uppercase placeholder:normal-case ${error ? "!border-error !bg-error/5" : ""}`}
          />
          <button type="submit" disabled={applying} className={`${CART_PRIMARY_BUTTON} flex-shrink-0`}>
            {applying ? "Applying…" : "Apply"}
          </button>
        </div>
        <p id={errorId} role="alert" className="mt-1.5 text-[12px] text-error empty:hidden">
          {error}
        </p>
      </form>
    </div>
  );
}
