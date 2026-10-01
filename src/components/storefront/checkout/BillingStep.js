"use client";

import { useRef, useState } from "react";
import StoreIcon from "../icons";
import CheckoutAddressFields from "./CheckoutAddressFields";
import { useCart } from "../cart/CartProvider";
import { CHECKOUT_BUTTON } from "./checkoutStyles";
import { ADDRESS_DEPENDENTS, focusFirstInvalid, validateAddress } from "./checkoutHelpers";

const ADDRESS_FIELDS = ["country", "line1", "state", "city", "zip"];
const NO_ERRORS = { billing: {}, shipping: {} };

const hasErrors = (errors) => Object.values(errors).some((section) => Object.keys(section).length > 0);
const differs = (place, address) => place.state !== address.state || place.city !== address.city;

const HEADING = "mb-4 text-[16px] font-semibold text-[#222222]";

// Step 2: where the order is billed and where it is delivered. The billing
// address is always filled in; "Same as billing address" (on by default) copies
// it into the shipping address, keeps the two in step while you edit, and greys
// the shipping fields out. Unchecked, the shipping address is its own form.
//
// For each address the country is picked and the state and city are typed. They
// have to exist in that country, the city in that state, and the postal code has
// to belong to that city (case and spacing don't matter, and a verified state or
// city is tidied to its proper spelling). Saving runs the cart's shipping
// estimate for the shipping address, where the server repeats the check.
export default function BillingStep({ billing, shipping, sameAsBilling, onBillingChange, onShippingChange, onSameChange, onComplete }) {
  const { countries, estimateShipping } = useCart();
  const [errors, setErrors] = useState(NO_ERRORS);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const formRef = useRef(null);

  function change(section, patch) {
    (section === "billing" ? onBillingChange : onShippingChange)(patch);
    // A message about the postal code ("doesn't match the city") or the city is stale once what it depends on changes.
    const cleared = new Set(Object.keys(patch));
    for (const key of Object.keys(patch)) (ADDRESS_DEPENDENTS[key] || []).forEach((dependent) => cleared.add(dependent));
    const touched = [...cleared].filter((key) => errors[section][key]);
    if (touched.length > 0) {
      setErrors((current) => ({ ...current, [section]: { ...current[section], ...Object.fromEntries(touched.map((key) => [key, ""])) } }));
    }
    if (formError) setFormError("");
  }

  function toggleSame(checked) {
    onSameChange(checked);
    // Whatever was flagged on the shipping fields belongs to the other mode.
    setErrors((current) => ({ ...current, shipping: {} }));
    if (formError) setFormError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (savingRef.current) return;

    // Same as billing: the shipping address is the billing one, so it is validated once and its
    // problems show on the billing fields. Otherwise both addresses are validated on their own.
    const billingResult = validateAddress(billing, countries);
    const shippingResult = sameAsBilling ? billingResult : validateAddress(shipping, countries);
    const found = { billing: billingResult.errors, shipping: sameAsBilling ? {} : shippingResult.errors };
    setErrors(found);
    if (hasErrors(found)) {
      focusFirstInvalid(formRef.current);
      return;
    }

    // Show each state and city the way the location data spells them.
    if (differs(billingResult.place, billing)) onBillingChange(billingResult.place);
    if (!sameAsBilling && differs(shippingResult.place, shipping)) onShippingChange(shippingResult.place);

    const destination = sameAsBilling ? billing : shipping;
    savingRef.current = true;
    setSaving(true);
    setFormError("");
    const result = await estimateShipping({
      country: destination.country,
      state: shippingResult.place.state,
      city: shippingResult.place.city,
      zip: destination.zip.trim(),
    });
    savingRef.current = false;
    setSaving(false);

    if (!result.ok) {
      // A 400 names the field that doesn't fit; anything else is a connection or server problem.
      if (result.status === 400) {
        const section = sameAsBilling ? "billing" : "shipping";
        setErrors({ ...NO_ERRORS, [section]: { [ADDRESS_FIELDS.includes(result.field) ? result.field : "zip"]: result.error } });
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
      <fieldset className="min-w-0">
        <legend className={HEADING}>Billing Address</legend>
        <CheckoutAddressFields
          section="billing"
          address={billing}
          errors={errors.billing}
          countries={countries}
          onChange={(patch) => change("billing", patch)}
        />
      </fieldset>

      <fieldset className="mt-9 min-w-0 border-t border-[#EEEEEE] pt-7">
        <legend className={`${HEADING} px-0`}>Shipping Address</legend>
        <label className="mb-5 flex cursor-pointer items-start gap-3 text-[15px] text-[#444444]">
          <input
            type="checkbox"
            checked={sameAsBilling}
            onChange={(event) => toggleSame(event.target.checked)}
            className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer rounded accent-[#EF9822]"
          />
          Same as billing address
        </label>
        <CheckoutAddressFields
          section="shipping"
          address={sameAsBilling ? billing : shipping}
          errors={errors.shipping}
          countries={countries}
          disabled={sameAsBilling}
          onChange={(patch) => change("shipping", patch)}
        />
      </fieldset>

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
