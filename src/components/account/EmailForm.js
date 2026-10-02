"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CheckoutField from "../storefront/checkout/CheckoutField";
import { requestJson } from "../storefront/cart/cartApi";
import PasswordInput from "./PasswordInput";
import SettingsCard from "./SettingsCard";
import { BTN_PRIMARY } from "./accountStyles";
import { validateEmailChange } from "./profileHelpers";

const FIELD_IDS = { email: "email-new", currentPassword: "email-current-password" };
const EMPTY = { email: "", currentPassword: "" };

// Changing the email address is something an attacker with a borrowed session
// would want, so it asks for the current password first.
export default function EmailForm({ customer, notify }) {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState(customer.email);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const formRef = useRef(null);

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function showErrors(next) {
    setErrors(next);
    const first = ["email", "currentPassword"].find((field) => next[field]);
    if (first) requestAnimationFrame(() => formRef.current?.querySelector(`#${FIELD_IDS[first]}`)?.focus());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current) return;

    const found = validateEmailChange(form, currentEmail);
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    const result = await requestJson("PATCH", "/api/account/email", { email: form.email.trim(), currentPassword: form.currentPassword });
    savingRef.current = false;
    setSaving(false);

    if (!result.ok) {
      if (result.field) showErrors({ [result.field]: result.error });
      else notify(result.error, "error");
      return;
    }

    setCurrentEmail(result.data.email);
    setForm(EMPTY);
    notify("Your email address was updated", "success");
    router.refresh();
  }

  return (
    <SettingsCard id="email" title="Email address" description="Used to sign in and for order confirmations.">
      <p className="mb-5 text-[14px] text-[#555555]">
        Current email: <span className="font-semibold text-[#333333]">{currentEmail}</span>
      </p>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <CheckoutField
            id={FIELD_IDS.email}
            label="New email address"
            type="email"
            error={errors.email}
            value={form.email}
            onChange={(event) => set("email", event.target.value)}
            autoComplete="email"
            placeholder="name@example.com"
            maxLength={255}
          />
          <PasswordInput
            id={FIELD_IDS.currentPassword}
            label="Current password"
            error={errors.currentPassword}
            value={form.currentPassword}
            onChange={(event) => set("currentPassword", event.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="mt-6">
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>
            {saving ? "Updating…" : "Update email"}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}
