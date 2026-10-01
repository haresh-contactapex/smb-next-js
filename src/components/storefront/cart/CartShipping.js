"use client";

import { useId, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { formatCurrency } from "@/lib/currency";
import { CART_FIELD, CART_LABEL, CART_PRIMARY_BUTTON } from "./cartStyles";

// "Estimate shipping": pick a destination, see the store's shipping options
// priced for this cart, and choose one to include in the estimated total.
export default function CartShipping() {
  const { countries, shipping, totals, estimateShipping, clearShipping, selectShippingRate } = useCart();
  const { currency } = useGeneralSettings();
  const [country, setCountry] = useState(shipping?.country || "");
  const [zip, setZip] = useState(shipping?.zip || "");
  const [errors, setErrors] = useState({});
  const [calculating, setCalculating] = useState(false);
  const calculatingRef = useRef(false);
  const countryId = useId();
  const zipId = useId();
  const countryRef = useRef(null);
  const zipRef = useRef(null);

  const destination = countries.find((entry) => entry.name === country);

  async function submit(event) {
    event.preventDefault();
    if (calculatingRef.current) return;

    if (!destination) {
      setErrors({ country: "Select a country." });
      countryRef.current?.focus();
      return;
    }
    if (destination.postalRequired && !zip.trim()) {
      setErrors({ zip: `Enter your ${destination.postalLabel.toLowerCase()}.` });
      zipRef.current?.focus();
      return;
    }

    calculatingRef.current = true;
    setCalculating(true);
    setErrors({});
    const result = await estimateShipping({ country, zip });
    calculatingRef.current = false;
    setCalculating(false);

    if (!result.ok) {
      // A 400 is the server rejecting the postal code; anything else is a general failure.
      if (result.status === 400) {
        setErrors({ zip: result.error });
        zipRef.current?.focus();
      } else {
        setErrors({ form: result.error });
      }
    }
  }

  function clear() {
    clearShipping();
    setCountry("");
    setZip("");
    setErrors({});
  }

  const fieldClass = (hasError) => `${CART_FIELD} ${hasError ? "!border-error !bg-error/5" : ""}`;

  return (
    <div>
      <form onSubmit={submit} noValidate className="space-y-3">
        <div>
          <label htmlFor={countryId} className={CART_LABEL}>
            Country
          </label>
          <select
            id={countryId}
            ref={countryRef}
            autoFocus
            value={country}
            onChange={(event) => {
              setCountry(event.target.value);
              setErrors({});
            }}
            aria-invalid={errors.country ? "true" : undefined}
            className={`${fieldClass(errors.country)} cursor-pointer`}
          >
            <option value="">Select a country</option>
            {countries.map((entry) => (
              <option key={entry.name} value={entry.name}>
                {entry.name}
              </option>
            ))}
          </select>
          <p role="alert" className="mt-1 text-[12px] text-error empty:hidden">
            {errors.country}
          </p>
        </div>

        <div>
          <label htmlFor={zipId} className={CART_LABEL}>
            {destination?.postalLabel || "ZIP / Postal code"}
          </label>
          <input
            id={zipId}
            ref={zipRef}
            type="text"
            value={zip}
            onChange={(event) => {
              setZip(event.target.value);
              if (errors.zip) setErrors({});
            }}
            autoComplete="postal-code"
            maxLength={12}
            aria-invalid={errors.zip ? "true" : undefined}
            className={fieldClass(errors.zip)}
          />
          <p role="alert" className="mt-1 text-[12px] text-error empty:hidden">
            {errors.zip || errors.form}
          </p>
        </div>

        <button type="submit" disabled={calculating} className={CART_PRIMARY_BUTTON}>
          {calculating ? "Calculating…" : "Calculate shipping"}
        </button>
      </form>

      {shipping && totals.rates.length > 0 && (
        <fieldset className="mt-4 border-t border-gray-100 pt-3">
          <legend className="sr-only">Shipping options for {shipping.country}</legend>
          <p className="mb-2 flex items-center justify-between gap-2 text-[12px] text-gray-500">
            <span>
              Shipping to {shipping.country}
              {shipping.zip ? `, ${shipping.zip}` : ""}
            </span>
            <button type="button" onClick={clear} className="underline hover:text-[#ef9822] transition-colors">
              Clear
            </button>
          </p>
          <div className="space-y-2">
            {totals.rates.map((rate) => (
              <label key={rate.id} className="flex cursor-pointer items-start gap-3 rounded border border-gray-200 px-3 py-2.5 text-[13px] hover:border-[#ef9822] transition-colors">
                <input
                  type="radio"
                  name="cart-shipping-rate"
                  className="custom-radio mt-0.5"
                  checked={shipping.selectedRateId === rate.id}
                  onChange={() => selectShippingRate(rate.id)}
                />
                <span className="flex-1">
                  <span className="block font-medium text-[#333333]">{rate.label}</span>
                  <span className="block text-[12px] text-gray-400">{rate.detail}</span>
                </span>
                <span className="font-semibold text-[#333333]">{rate.price === 0 ? "Free" : formatCurrency(rate.price, currency)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
