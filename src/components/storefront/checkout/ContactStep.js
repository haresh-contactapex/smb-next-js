"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import StoreIcon from "../icons";
import CheckoutField, { FieldShell, fieldA11y } from "./CheckoutField";
import { CHECKOUT_BUTTON, CHECKOUT_FIELD_BOX, CHECKOUT_FIELD_ERROR } from "./checkoutStyles";
import { PHONE_COUNTRIES, focusFirstInvalid, formatPhoneInput, phoneCountryOf, validateContact } from "./checkoutHelpers";

// Step 1: who the order is for and how to reach them. A guest (`showSignIn`) is
// offered a way to sign in, which brings them back here with their details and
// saved addresses filled in; the cart and what they have typed are kept.
export default function ContactStep({ contact, showSignIn = false, onChange, onComplete }) {
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const phoneCountry = phoneCountryOf(contact.phoneCountry);

  function update(patch) {
    onChange(patch);
    const touched = Object.keys(patch).filter((key) => errors[key]);
    if (touched.length > 0) setErrors((current) => ({ ...current, ...Object.fromEntries(touched.map((key) => [key, ""])) }));
  }

  function submit(event) {
    event.preventDefault();
    const found = validateContact(contact);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(formRef.current);
      return;
    }
    onComplete();
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      {showSignIn && (
        <p className="mb-6 rounded-lg bg-[#FAFAFA] px-4 py-3 text-[14px] text-[#555555]">
          Already have an account?{" "}
          <Link href="/login?next=%2Fcheckout" className="font-semibold text-[#333333] underline transition-colors hover:text-[#EF9822]">
            Sign in
          </Link>{" "}
          to fill in your details and use your saved addresses.
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <CheckoutField
          id="checkout-first-name"
          label="First Name"
          error={errors.firstName}
          value={contact.firstName}
          onChange={(event) => update({ firstName: event.target.value })}
          autoComplete="given-name"
          placeholder="John"
          maxLength={60}
        />
        <CheckoutField
          id="checkout-last-name"
          label="Last Name"
          error={errors.lastName}
          value={contact.lastName}
          onChange={(event) => update({ lastName: event.target.value })}
          autoComplete="family-name"
          placeholder="Doe"
          maxLength={60}
        />
      </div>

      <CheckoutField
        id="checkout-email"
        label="Email Address"
        className="mt-5"
        error={errors.email}
        type="email"
        value={contact.email}
        onChange={(event) => update({ email: event.target.value })}
        autoComplete="email"
        placeholder="john.doe@example.com"
        maxLength={120}
      />

      <FieldShell id="checkout-phone" label="Phone Number" className="mt-5" error={errors.phone}>
        <div className={`flex ${CHECKOUT_FIELD_BOX} ${errors.phone ? CHECKOUT_FIELD_ERROR : ""}`}>
          <div className="relative flex items-center gap-2 rounded-l-lg border-r border-[#E4E4E4] bg-[#FAFAFA] px-3.5 text-[15px] text-[#333333]">
            <span aria-hidden="true" className="text-[18px] leading-none">
              {phoneCountry.flag}
            </span>
            <span aria-hidden="true" className="font-medium">
              {phoneCountry.dial}
            </span>
            <StoreIcon name="chevronDown" className="h-3.5 w-3.5 text-[#777777]" />
            <select
              aria-label="Country calling code"
              value={contact.phoneCountry}
              onChange={(event) => update({ phoneCountry: event.target.value, phone: formatPhoneInput(contact.phone, event.target.value) })}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            >
              {PHONE_COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.name} ({country.dial})
                </option>
              ))}
            </select>
          </div>
          <input
            id="checkout-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={contact.phone}
            onChange={(event) => update({ phone: formatPhoneInput(event.target.value, contact.phoneCountry) })}
            placeholder="(555) 123-4567"
            {...fieldA11y("checkout-phone", true, errors.phone)}
            className="min-w-0 flex-1 rounded-r-lg bg-transparent px-4 py-3.5 text-[15px] text-[#333333] outline-none placeholder:text-[#B5B5B5]"
          />
        </div>
      </FieldShell>

      <label className="mt-6 flex cursor-pointer items-start gap-3 text-[15px] text-[#444444]">
        <input
          type="checkbox"
          checked={contact.updates}
          onChange={(event) => update({ updates: event.target.checked })}
          className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer rounded accent-[#EF9822]"
        />
        Keep me updated on order status and special offers
      </label>

      <button type="submit" className={`${CHECKOUT_BUTTON} mt-7`}>
        Save &amp; Continue
        <StoreIcon name="arrowRight" className="h-5 w-5" />
      </button>
    </form>
  );
}
