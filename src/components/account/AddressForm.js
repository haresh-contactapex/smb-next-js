"use client";

import { useEffect, useRef, useState } from "react";
import CheckoutField from "../storefront/checkout/CheckoutField";
import CheckoutAddressFields from "../storefront/checkout/CheckoutAddressFields";
import { ADDRESS_LABELS, ADDRESS_FIELD_IDS, ADDRESS_FIELD_ORDER, EMPTY_ADDRESS_FORM, formatPhoneInput, formFromAddress, validateAddressForm } from "./addressHelpers";
import { BTN_OUTLINE, BTN_PRIMARY, CARD, FIELD } from "./accountStyles";

// What changing a field makes stale: the messages about the fields under it.
const DEPENDENTS = { country: ["state", "city", "zip"], state: ["city", "zip"], city: ["zip"] };

// Add / edit one address. `address` is the saved address being edited, or null
// for a new one; `isFirst` is true when it will be the customer's first (it then
// becomes both defaults automatically, so the checkboxes are left out).
// `onSubmit(values)` resolves to { ok } or { ok: false, error, field }.
export default function AddressForm({ address, isFirst, countries, onSubmit, onCancel }) {
  const editing = Boolean(address);
  const [form, setForm] = useState(() => (address ? formFromAddress(address) : { ...EMPTY_ADDRESS_FORM }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const formRef = useRef(null);

  useEffect(() => {
    formRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    formRef.current?.querySelector(`#${ADDRESS_FIELD_IDS.fullName}`)?.focus({ preventScroll: true });
  }, []);

  // Typing in a field clears its message, and a changed country/state/city clears
  // the messages about the fields that depend on it (as the checkout does).
  function update(changes) {
    setForm((current) => ({ ...current, ...changes }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(changes)) {
        delete next[key];
        for (const dependent of DEPENDENTS[key] || []) delete next[dependent];
      }
      return next;
    });
  }

  function showErrors(next) {
    setErrors(next);
    const first = ADDRESS_FIELD_ORDER.find((field) => next[field]);
    if (first && ADDRESS_FIELD_IDS[first]) {
      requestAnimationFrame(() => formRef.current?.querySelector(`#${ADDRESS_FIELD_IDS[first]}`)?.focus());
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current) return;

    const checked = validateAddressForm(form, countries);
    if (!checked.values) {
      showErrors(checked.errors);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    const result = await onSubmit(checked.values);
    savingRef.current = false;
    setSaving(false);
    if (!result.ok && result.field) showErrors({ [result.field]: result.error });
  }

  const title = editing ? "Edit address" : "Add a new address";

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-labelledby="address-form-title" className={`${CARD} p-5 sm:p-7`}>
      <h2 id="address-form-title" className="text-[20px] font-semibold text-[#333333]">
        {title}
      </h2>

      <fieldset className="mt-5">
        <legend className="mb-2 text-[14px] font-medium text-[#333333]">Label</legend>
        <div className="flex flex-wrap items-center gap-2">
          {ADDRESS_LABELS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => update({ label })}
              aria-pressed={form.label === label}
              className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                form.label === label ? "border-[#4A4A4A] bg-[#4A4A4A] text-white" : "border-gray-300 text-[#555555] hover:border-[#ef9822] hover:text-[#ef9822]"
              }`}
            >
              {label}
            </button>
          ))}
          <input
            aria-label="Custom label"
            value={form.label}
            onChange={(event) => update({ label: event.target.value })}
            maxLength={40}
            placeholder="Or name it yourself"
            className={`${FIELD} !w-auto min-w-0 flex-1 !py-1.5 !text-[13px] sm:max-w-[220px]`}
          />
        </div>
      </fieldset>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <CheckoutField
          id={ADDRESS_FIELD_IDS.fullName}
          label="Full name"
          error={errors.fullName}
          value={form.fullName}
          onChange={(event) => update({ fullName: event.target.value })}
          autoComplete="name"
          placeholder="Who receives the parcel"
          maxLength={150}
        />
        <CheckoutField
          id="address-company"
          label="Company"
          required={false}
          value={form.company}
          onChange={(event) => update({ company: event.target.value })}
          autoComplete="organization"
          maxLength={150}
        />
        <CheckoutField
          id={ADDRESS_FIELD_IDS.phone}
          label="Phone"
          required={false}
          error={errors.phone}
          value={form.phone}
          onChange={(event) => update({ phone: formatPhoneInput(event.target.value) })}
          autoComplete="tel"
          inputMode="tel"
          placeholder="(555) 000-0000"
        />
      </div>

      <div className="mt-5">
        <CheckoutAddressFields section="shipping" address={form} errors={errors} countries={countries} onChange={update} />
      </div>

      <div className="mt-5">
        <label htmlFor="address-instructions" className="mb-2 block text-[14px] font-medium text-[#333333]">
          Delivery instructions <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="address-instructions"
          value={form.instructions}
          onChange={(event) => update({ instructions: event.target.value })}
          rows={3}
          maxLength={500}
          placeholder="Gate code, safe place to leave the parcel, best time to deliver…"
          className={`${FIELD} resize-y`}
        />
      </div>

      {!isFirst && (
        <div className="mt-5 flex flex-col gap-2.5 text-[14px] text-[#555555]">
          {!address?.isDefaultShipping && (
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.makeDefaultShipping}
                onChange={(event) => update({ makeDefaultShipping: event.target.checked })}
                className="h-4 w-4 rounded border-gray-300 accent-[#ef9822]"
              />
              Use as my default shipping address
            </label>
          )}
          {!address?.isDefaultBilling && (
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.makeDefaultBilling}
                onChange={(event) => update({ makeDefaultBilling: event.target.checked })}
                className="h-4 w-4 rounded border-gray-300 accent-[#ef9822]"
              />
              Use as my default billing address
            </label>
          )}
        </div>
      )}

      <div className="mt-7 flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className={BTN_PRIMARY}>
          {saving ? "Saving…" : editing ? "Save changes" : "Save address"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={BTN_OUTLINE}>
          Cancel
        </button>
      </div>
    </form>
  );
}
