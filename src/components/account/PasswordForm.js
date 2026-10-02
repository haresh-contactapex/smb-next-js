"use client";

import { useRef, useState } from "react";
import { requestJson } from "../storefront/cart/cartApi";
import StoreIcon from "../storefront/icons";
import PasswordInput from "./PasswordInput";
import SettingsCard from "./SettingsCard";
import { BTN_PRIMARY } from "./accountStyles";
import { passwordRequirements, passwordStrength, validatePasswordChange } from "./profileHelpers";

const FIELD_IDS = { currentPassword: "password-current", newPassword: "password-new", confirmPassword: "password-confirm" };
const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

// Live strength bar and the four rules, so a customer sees what is still missing
// while they type rather than after pressing Save.
function PasswordGuidance({ value }) {
  if (!value) return null;
  const strength = passwordStrength(value);
  return (
    <div className="mt-2.5" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
          <div className={`h-full rounded-full transition-all ${strength.barClass}`} style={{ width: `${strength.percent}%` }} />
        </div>
        <span className={`text-[12px] font-semibold ${strength.textClass}`}>{strength.label}</span>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
        {passwordRequirements(value).map((rule) => (
          <li key={rule.id} className={`flex items-center gap-1.5 ${rule.met ? "text-green-700" : "text-gray-500"}`}>
            <StoreIcon name={rule.met ? "check" : "minus"} className="h-3.5 w-3.5" />
            {rule.label}
            <span className="sr-only">{rule.met ? " (met)" : " (not met yet)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PasswordForm({ notify }) {
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
    const first = ["currentPassword", "newPassword", "confirmPassword"].find((field) => next[field]);
    if (first) requestAnimationFrame(() => formRef.current?.querySelector(`#${FIELD_IDS[first]}`)?.focus());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current) return;

    const found = validatePasswordChange(form);
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    const result = await requestJson("PATCH", "/api/account/password", {
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
    savingRef.current = false;
    setSaving(false);

    if (!result.ok) {
      if (result.field) showErrors({ [result.field]: result.error });
      else notify(result.error, "error");
      return;
    }

    setForm(EMPTY); // never leave passwords sitting in the form
    notify("Your password was changed", "success");
  }

  return (
    <SettingsCard id="password" title="Password" description="Choose a strong password you don't use anywhere else.">
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <PasswordInput
            id={FIELD_IDS.currentPassword}
            label="Current password"
            error={errors.currentPassword}
            value={form.currentPassword}
            onChange={(event) => set("currentPassword", event.target.value)}
            autoComplete="current-password"
          />
          <span className="hidden sm:block" />
          <PasswordInput
            id={FIELD_IDS.newPassword}
            label="New password"
            error={errors.newPassword}
            value={form.newPassword}
            onChange={(event) => set("newPassword", event.target.value)}
            autoComplete="new-password"
          >
            <PasswordGuidance value={form.newPassword} />
          </PasswordInput>
          <PasswordInput
            id={FIELD_IDS.confirmPassword}
            label="Confirm new password"
            error={errors.confirmPassword}
            value={form.confirmPassword}
            onChange={(event) => set("confirmPassword", event.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="mt-6">
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>
            {saving ? "Updating…" : "Change password"}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}
