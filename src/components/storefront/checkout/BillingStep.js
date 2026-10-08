"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import StoreIcon from "../icons";
import CheckoutAddressFields from "./CheckoutAddressFields";
import SavedAddressPicker from "./SavedAddressPicker";
import { useCart } from "../cart/CartProvider";
import { postJson } from "../cart/cartApi";
import { CHECKOUT_BUTTON } from "./checkoutStyles";
import { ADDRESS_DEPENDENTS, focusFirstInvalid, formatAddress, validateAddress } from "./checkoutHelpers";

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
//
// A signed-in customer's `savedAddresses` add a picker above each address: choosing
// one fills the block (and, while "same as billing" is on, the shipping copy too),
// and a saved address goes through exactly the same checks as a typed one.
//
// The shipping block folds away behind its heading. It starts folded while "same as
// billing" is on (its fields are only a greyed-out copy) and open when it is off, the
// checkbox stays in view either way, and a folded block shows a one-line "Ships to" summary.
// Opening or folding it by hand sticks until the checkbox is toggled again. Any problem
// found in the shipping fields opens it, so an error is never left out of sight.
export default function BillingStep({
  billing,
  shipping,
  sameAsBilling,
  savedAddresses = [],
  onBillingChange,
  onShippingChange,
  onSameChange,
  onComplete,
}) {
  const { countries, estimateShipping } = useCart();
  const [errors, setErrors] = useState(NO_ERRORS);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  // null: follow the checkbox (folded while "same as billing" is on); true / false: the customer chose.
  const [shippingChoice, setShippingChoice] = useState(null);
  const savingRef = useRef(false);
  const formRef = useRef(null);
  const shippingOpen = shippingChoice ?? !sameAsBilling;
  const shippingAddress = sameAsBilling ? billing : shipping;
  const shippingSummary = formatAddress(shippingAddress);

  // Records what was found wrong and moves focus to the first bad field. The shipping fields may
  // be folded away, and a hidden field can't take focus, so open them first when they are involved.
  function flagErrors(next) {
    setErrors(next);
    if (Object.keys(next.shipping).length > 0) setShippingChoice(true);
    focusFirstInvalid(formRef.current);
  }

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
    setShippingChoice(null);
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
    if (hasErrors(found)) {
      flagErrors(found);
      return;
    }

    // Show each state and city the way the location data spells them.
    if (differs(billingResult.place, billing)) onBillingChange(billingResult.place);
    if (!sameAsBilling && differs(shippingResult.place, shipping)) onShippingChange(shippingResult.place);

    const destination = sameAsBilling ? billing : shipping;
    savingRef.current = true;
    setSaving(true);
    setFormError("");

    // A separate billing address gets the same server check as the shipping one (it never reaches
    // the estimate below), so a US address that doesn't exist is flagged here, not when paying.
    if (!sameAsBilling) {
      const billingCheck = await postJson("/api/cart/shipping", {
        country: billing.country,
        state: billingResult.place.state,
        city: billingResult.place.city,
        zip: billing.zip.trim(),
      });
      if (!billingCheck.ok) {
        savingRef.current = false;
        setSaving(false);
        if (billingCheck.status === 400) {
          flagErrors({ ...NO_ERRORS, billing: { [ADDRESS_FIELDS.includes(billingCheck.field) ? billingCheck.field : "zip"]: billingCheck.error } });
        } else {
          setFormError(billingCheck.error);
        }
        return;
      }
    }

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
        flagErrors({ ...NO_ERRORS, [section]: { [ADDRESS_FIELDS.includes(result.field) ? result.field : "zip"]: result.error } });
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
        {savedAddresses.length > 0 && (
          <>
            <SavedAddressPicker section="billing" addresses={savedAddresses} address={billing} onPick={(patch) => change("billing", patch)} />
            <p className="-mt-2 mb-5 text-[13px] text-[#777777]">
              <Link href="/account/addresses" className="font-medium text-[#444444] underline transition-colors hover:text-[#EF9822]">
                Manage saved addresses
              </Link>
            </p>
          </>
        )}
        <CheckoutAddressFields
          section="billing"
          address={billing}
          errors={errors.billing}
          countries={countries}
          onChange={(patch) => change("billing", patch)}
        />
      </fieldset>

      <section aria-labelledby="checkout-shipping-heading" className="mt-9 min-w-0">
        {/* The whole row is the button: title, a rule across, and the chevron at the right edge. */}
        <h3 id="checkout-shipping-heading" className="mb-5">
          <button
            type="button"
            onClick={() => setShippingChoice(!shippingOpen)}
            aria-expanded={shippingOpen}
            aria-controls="checkout-shipping-fields"
            className="flex w-full items-center gap-3 rounded text-left text-[16px] font-semibold text-[#222222] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EF9822]"
          >
            <span>Shipping Address</span>
            <span aria-hidden="true" className="h-px flex-1 bg-[#EEEEEE]" />
            <StoreIcon name={shippingOpen ? "chevronUp" : "chevronDown"} className="h-5 w-5 flex-shrink-0 text-[#555555]" />
          </button>
        </h3>
        <label className="mb-5 flex cursor-pointer items-start gap-3 text-[15px] text-[#444444]">
          <input
            type="checkbox"
            checked={sameAsBilling}
            onChange={(event) => toggleSame(event.target.checked)}
            className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer rounded accent-[#EF9822]"
          />
          Same as billing address
        </label>
        {!shippingOpen && shippingSummary && (
          <p className="-mt-2 flex items-start gap-2 text-[14px] text-[#777777]">
            <StoreIcon name="mapPin" className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#EF9822]" />
            <span>
              Ships to: <span className="text-[#444444]">{shippingSummary}</span>
            </span>
          </p>
        )}
        {/* Hidden rather than unmounted, so what was typed, and any message about it, survives folding. */}
        <div id="checkout-shipping-fields" hidden={!shippingOpen}>
          {savedAddresses.length > 0 && (
            <SavedAddressPicker
              section="shipping"
              addresses={savedAddresses}
              address={shippingAddress}
              disabled={sameAsBilling}
              onPick={(patch) => change("shipping", patch)}
            />
          )}
          <CheckoutAddressFields
            section="shipping"
            address={shippingAddress}
            errors={errors.shipping}
            countries={countries}
            disabled={sameAsBilling}
            onChange={(patch) => change("shipping", patch)}
          />
        </div>
      </section>

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
