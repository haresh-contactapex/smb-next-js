"use client";

import { useEffect, useRef, useState } from "react";
import CheckoutField from "../storefront/checkout/CheckoutField";
import ChoiceSelect from "./ChoiceSelect";
import { BTN_OUTLINE, BTN_PRIMARY } from "./accountStyles";
import { addressLines } from "./accountHelpers";
import { describeCard, formatExpiry, formatExpiryInput, parseExpiry } from "./cardHelpers";

const describeAddress = (address) => `${address.label} - ${addressLines(address).slice(0, 2).join(", ")}`;

// Edits what can change on a saved card: nickname, a renewed expiry date and the
// billing address. A different card number is a different card, so it is added
// as a new one instead. `onSubmit(values)` resolves to { ok } or { ok: false, error, field }.
export default function CardEditForm({ card, addresses, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    nickname: card.nickname,
    expiry: formatExpiry(card.expMonth, card.expYear),
    billingAddressId: card.billingAddressId || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const formRef = useRef(null);
  const idPrefix = `card-edit-${card.id}`;
  const focusExpiry = () => formRef.current?.querySelector(`#${idPrefix}-expiry`)?.focus();

  useEffect(() => {
    focusExpiry();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus once, when the editor opens
  }, []);

  const set = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current) return;

    const expiry = parseExpiry(form.expiry);
    if (expiry.error) {
      setErrors({ expiry: expiry.error });
      focusExpiry();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    const result = await onSubmit({
      nickname: form.nickname.trim(),
      expMonth: expiry.month,
      expYear: expiry.year,
      billingAddressId: form.billingAddressId || null,
    });
    savingRef.current = false;
    setSaving(false);
    if (!result.ok && result.field) setErrors({ [result.field]: result.error });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-label={`Edit ${describeCard(card)}`} className="mt-4 rounded-xl border border-gray-200 bg-[#FAFAFA] p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CheckoutField
          id={`${idPrefix}-nickname`}
          label="Nickname"
          required={false}
          value={form.nickname}
          onChange={(event) => set("nickname", event.target.value)}
          maxLength={40}
        />
        <div>
          <CheckoutField
            id={`${idPrefix}-expiry`}
            label="Expiry date"
            error={errors.expiry}
            value={form.expiry}
            onChange={(event) => set("expiry", formatExpiryInput(event.target.value))}
            inputMode="numeric"
            placeholder="MM/YY"
            maxLength={5}
          />
        </div>
        {addresses.length > 0 && (
          <ChoiceSelect
            id={`${idPrefix}-billing`}
            label="Billing address"
            required={false}
            className="sm:col-span-2"
            error={errors.billingAddressId}
            value={form.billingAddressId}
            onChange={(event) => set("billingAddressId", event.target.value)}
            placeholder="No billing address"
            options={addresses.map((address) => ({ value: address.id, label: describeAddress(address) }))}
          />
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className={`${BTN_PRIMARY} !px-5 !py-2.5`}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={BTN_OUTLINE}>
          Cancel
        </button>
      </div>
    </form>
  );
}
