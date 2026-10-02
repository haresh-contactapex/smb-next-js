"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CheckoutField from "../storefront/checkout/CheckoutField";
import { requestJson } from "../storefront/cart/cartApi";
import SettingsCard from "./SettingsCard";
import { BTN_PRIMARY } from "./accountStyles";
import { formatPhoneInput } from "./addressHelpers";
import { validateProfile } from "./profileHelpers";

const FIELD_IDS = { firstName: "profile-first-name", lastName: "profile-last-name", phone: "profile-phone" };

// Name, phone and email-marketing choice. These need no password; the email
// address and password have their own cards that do.
export default function ProfileDetailsForm({ customer, notify }) {
  const router = useRouter();
  const [saved, setSaved] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone || "",
    acceptsMarketing: Boolean(customer.acceptsMarketing),
  });
  const [form, setForm] = useState(saved);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const formRef = useRef(null);

  const dirty = Object.keys(saved).some((key) => saved[key] !== form[key]);

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function showErrors(next) {
    setErrors(next);
    const first = ["firstName", "lastName", "phone"].find((field) => next[field]);
    if (first) requestAnimationFrame(() => formRef.current?.querySelector(`#${FIELD_IDS[first]}`)?.focus());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current) return;

    const found = validateProfile(form);
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    const result = await requestJson("PATCH", "/api/account/profile", form);
    savingRef.current = false;
    setSaving(false);

    if (!result.ok) {
      if (result.field) showErrors({ [result.field]: result.error });
      notify(result.error, "error");
      return;
    }

    const next = {
      firstName: result.data.firstName,
      lastName: result.data.lastName,
      phone: result.data.phone || "",
      acceptsMarketing: Boolean(result.data.acceptsMarketing),
    };
    setSaved(next);
    setForm(next);
    notify("Your details were saved", "success");
    router.refresh(); // the sidebar greets the customer by name
  }

  return (
    <SettingsCard id="details" title="Personal details" description="The name on your account and how we can reach you.">
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <CheckoutField
            id={FIELD_IDS.firstName}
            label="First name"
            error={errors.firstName}
            value={form.firstName}
            onChange={(event) => set("firstName", event.target.value)}
            autoComplete="given-name"
            maxLength={100}
          />
          <CheckoutField
            id={FIELD_IDS.lastName}
            label="Last name"
            error={errors.lastName}
            value={form.lastName}
            onChange={(event) => set("lastName", event.target.value)}
            autoComplete="family-name"
            maxLength={100}
          />
          <CheckoutField
            id={FIELD_IDS.phone}
            label="Phone"
            required={false}
            error={errors.phone}
            value={form.phone}
            onChange={(event) => set("phone", formatPhoneInput(event.target.value))}
            autoComplete="tel"
            inputMode="tel"
            placeholder="(555) 000-0000"
            className="sm:col-span-2 sm:max-w-[calc(50%-0.625rem)]"
          />
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 text-[14px] text-[#555555]">
          <input
            type="checkbox"
            checked={form.acceptsMarketing}
            onChange={(event) => set("acceptsMarketing", event.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-[#ef9822]"
          />
          <span>
            <span className="font-medium text-[#333333]">Send me news and offers by email</span>
            <span className="block text-gray-500">New collections and special offers. Order updates are always sent, whatever you choose here.</span>
          </span>
        </label>

        <div className="mt-6">
          <button type="submit" disabled={saving || !dirty} className={BTN_PRIMARY}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}
