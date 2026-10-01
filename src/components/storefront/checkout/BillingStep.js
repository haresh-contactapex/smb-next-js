"use client";

import { useRef, useState } from "react";
import StoreIcon from "../icons";
import CheckoutField, { FieldShell, fieldA11y } from "./CheckoutField";
import { useCart } from "../cart/CartProvider";
import { CHECKOUT_BUTTON, CHECKOUT_FIELD, CHECKOUT_FIELD_ERROR } from "./checkoutStyles";
import { focusFirstInvalid, validateAddress } from "./checkoutHelpers";

// Step 2: the address the order is billed to and delivered to. Saving it also
// runs the cart's shipping estimate for that destination, so the postal code
// is checked against the country's format and the summary can show shipping.
export default function BillingStep({ address, onChange, onComplete }) {
  const { countries, estimateShipping } = useCart();
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const formRef = useRef(null);
  const country = countries.find((candidate) => candidate.name === address.country);

  function update(patch) {
    onChange(patch);
    const touched = Object.keys(patch).filter((key) => errors[key]);
    if (touched.length > 0) setErrors((current) => ({ ...current, ...Object.fromEntries(touched.map((key) => [key, ""])) }));
    if (formError) setFormError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (savingRef.current) return;

    const found = validateAddress(address, countries);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(formRef.current);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setFormError("");
    const result = await estimateShipping({ country: address.country, zip: address.zip.trim() });
    savingRef.current = false;
    setSaving(false);

    if (!result.ok) {
      // A 400 means the postal code isn't valid for the country; anything else is a connection or server problem.
      if (result.status === 400) {
        setErrors({ zip: result.error });
        focusFirstInvalid(formRef.current);
      } else {
        setFormError(result.error);
      }
      return;
    }
    onComplete();
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <FieldShell id="checkout-country" label="Country" error={errors.country}>
        <div className="relative">
          <select
            id="checkout-country"
            value={address.country}
            onChange={(event) => update({ country: event.target.value })}
            autoComplete="country-name"
            {...fieldA11y("checkout-country", true, errors.country)}
            className={`${CHECKOUT_FIELD} appearance-none pr-11 ${errors.country ? CHECKOUT_FIELD_ERROR : ""}`}
          >
            {!country && <option value="">Select a country</option>}
            {countries.map((candidate) => (
              <option key={candidate.name} value={candidate.name}>
                {candidate.name}
              </option>
            ))}
          </select>
          <StoreIcon name="chevronDown" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]" />
        </div>
      </FieldShell>

      <CheckoutField
        id="checkout-address-1"
        label="Street Address"
        className="mt-5"
        error={errors.line1}
        value={address.line1}
        onChange={(event) => update({ line1: event.target.value })}
        autoComplete="address-line1"
        placeholder="123 Main Street"
        maxLength={120}
      />

      <CheckoutField
        id="checkout-address-2"
        label="Apartment, suite, etc."
        required={false}
        className="mt-5"
        value={address.line2}
        onChange={(event) => update({ line2: event.target.value })}
        autoComplete="address-line2"
        placeholder="Apt 4B (optional)"
        maxLength={120}
      />

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <CheckoutField
          id="checkout-city"
          label="City"
          error={errors.city}
          value={address.city}
          onChange={(event) => update({ city: event.target.value })}
          autoComplete="address-level2"
          placeholder="Los Angeles"
          maxLength={80}
        />
        <CheckoutField
          id="checkout-state"
          label="State / Province"
          error={errors.state}
          value={address.state}
          onChange={(event) => update({ state: event.target.value })}
          autoComplete="address-level1"
          placeholder="California"
          maxLength={80}
        />
      </div>

      <CheckoutField
        id="checkout-zip"
        label={country?.postalLabel || "Postal Code"}
        required={country ? country.postalRequired : true}
        className="mt-5 sm:max-w-[calc(50%-0.625rem)]"
        error={errors.zip}
        value={address.zip}
        onChange={(event) => update({ zip: event.target.value })}
        autoComplete="postal-code"
        placeholder="90001"
        maxLength={12}
      />

      <p role="alert" className="mt-5 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-[14px] text-error empty:hidden">
        {formError}
      </p>

      <button type="submit" disabled={saving} className={`${CHECKOUT_BUTTON} mt-7`}>
        {saving ? "Checking address…" : "Save & Continue"}
        {!saving && <StoreIcon name="arrowRight" className="h-5 w-5" />}
      </button>
    </form>
  );
}
