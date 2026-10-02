"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import CheckoutField, { FieldShell, fieldA11y } from "../storefront/checkout/CheckoutField";
import ChoiceSelect from "./ChoiceSelect";
import StoreIcon from "../storefront/icons";
import { BTN_OUTLINE, BTN_PRIMARY, CARD, FIELD, FIELD_ERROR } from "./accountStyles";
import { CARD_BRAND_LABELS, detectBrand, digitsOnly, formatCardNumber, formatExpiryInput, parseExpiry, validateCardNumber } from "./cardHelpers";
import { addressLines } from "./accountHelpers";

// Top-to-bottom order of the form's fields and the DOM id of each, for focusing the first one in error.
const FIELD_ORDER = ["number", "holderName", "expiry", "billingAddressId"];
const FIELD_IDS = { number: "card-number", holderName: "card-name", expiry: "card-expiry", billingAddressId: "card-billing" };

const describeAddress = (address) => `${address.label} - ${addressLines(address).slice(0, 2).join(", ")}`;

// "Add a card". The full number is only used here, in the browser, to work out
// the brand and last four digits and to catch typos; just those (plus expiry
// and name) are sent. There is deliberately no CVV field: it is never saved, so
// asking for it would only suggest it is.
//
// `onSubmit(values)` resolves to { ok } or { ok: false, error, field }.
export default function AddCardForm({ addresses, isFirstCard, onSubmit, onCancel }) {
  const defaultBilling = addresses.find((address) => address.isDefaultBilling) || null;
  const [form, setForm] = useState({
    number: "",
    holderName: "",
    expiry: "",
    nickname: "",
    billingAddressId: defaultBilling?.id || "",
    makeDefault: false,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const formRef = useRef(null);
  const numberRef = useRef(null);

  useEffect(() => {
    numberRef.current?.focus();
    formRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  const brand = detectBrand(form.number);
  const set = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  function focusFirstError(next) {
    const first = FIELD_ORDER.find((field) => next[field]);
    if (first) requestAnimationFrame(() => formRef.current?.querySelector(`#${FIELD_IDS[first]}`)?.focus());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current) return;

    const next = {};
    const numberError = validateCardNumber(form.number);
    if (numberError) next.number = numberError;
    if (!form.holderName.trim()) next.holderName = "Enter the name on the card.";
    const expiry = parseExpiry(form.expiry);
    if (expiry.error) next.expiry = expiry.error;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      focusFirstError(next);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    const digits = digitsOnly(form.number);
    const result = await onSubmit({
      brand,
      last4: digits.slice(-4),
      expMonth: expiry.month,
      expYear: expiry.year,
      holderName: form.holderName.trim(),
      nickname: form.nickname.trim(),
      billingAddressId: form.billingAddressId || null,
      makeDefault: form.makeDefault,
    });
    savingRef.current = false;
    setSaving(false);

    if (!result.ok && result.field) {
      setErrors({ [result.field]: result.error });
      focusFirstError({ [result.field]: true });
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-labelledby="add-card-title" className={`${CARD} p-5 sm:p-7`}>
      <h2 id="add-card-title" className="text-[20px] font-semibold text-[#333333]">
        Add a card
      </h2>
      <p className="mt-1 flex items-start gap-2 text-[13px] text-gray-500">
        <StoreIcon name="lockClosed" className="mt-0.5 h-4 w-4 flex-shrink-0" />
        We keep only the card type, last four digits, expiry and name. Your full number is never saved, and we don&apos;t ask for your CVV.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <FieldShell id="card-number" label="Card number" error={errors.number} className="sm:col-span-2">
          <div className="relative">
            <input
              ref={numberRef}
              id="card-number"
              {...fieldA11y("card-number", true, errors.number)}
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              value={form.number}
              onChange={(event) => set("number", formatCardNumber(event.target.value))}
              className={`${FIELD} pr-32 font-mono tracking-wide ${errors.number ? FIELD_ERROR : ""}`}
            />
            {digitsOnly(form.number).length >= 1 && brand !== "other" && (
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#555555]">
                {CARD_BRAND_LABELS[brand]}
              </span>
            )}
          </div>
        </FieldShell>

        <CheckoutField
          id="card-name"
          label="Name on card"
          error={errors.holderName}
          value={form.holderName}
          onChange={(event) => set("holderName", event.target.value)}
          autoComplete="cc-name"
          placeholder="As printed on the card"
          maxLength={150}
        />

        <CheckoutField
          id="card-expiry"
          label="Expiry date"
          error={errors.expiry}
          value={form.expiry}
          onChange={(event) => set("expiry", formatExpiryInput(event.target.value))}
          autoComplete="cc-exp"
          inputMode="numeric"
          placeholder="MM/YY"
          maxLength={5}
        />

        <CheckoutField
          id="card-nickname"
          label="Nickname"
          required={false}
          value={form.nickname}
          onChange={(event) => set("nickname", event.target.value)}
          placeholder="e.g. Personal, Work"
          maxLength={40}
        />

        {addresses.length > 0 ? (
          <ChoiceSelect
            id="card-billing"
            label="Billing address"
            required={false}
            error={errors.billingAddressId}
            value={form.billingAddressId}
            onChange={(event) => set("billingAddressId", event.target.value)}
            placeholder="No billing address"
            options={addresses.map((address) => ({ value: address.id, label: describeAddress(address) }))}
          />
        ) : (
          <p className="self-end pb-3 text-[13px] text-gray-500">
            Want a billing address on this card?{" "}
            <Link href="/account/addresses" className="font-semibold text-[#333333] underline hover:text-[#ef9822]">
              Add an address
            </Link>{" "}
            first.
          </p>
        )}
      </div>

      {!isFirstCard && (
        <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-[14px] text-[#555555]">
          <input
            type="checkbox"
            checked={form.makeDefault}
            onChange={(event) => set("makeDefault", event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-[#ef9822]"
          />
          Make this my default card
        </label>
      )}

      <div className="mt-7 flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className={BTN_PRIMARY}>
          {saving ? "Saving…" : "Save card"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={BTN_OUTLINE}>
          Cancel
        </button>
      </div>
    </form>
  );
}
