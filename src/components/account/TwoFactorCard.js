"use client";

import { useRef, useState } from "react";
import { requestJson } from "../storefront/cart/cartApi";
import PasswordInput from "./PasswordInput";
import SettingsCard from "./SettingsCard";
import { BTN_DANGER, BTN_PRIMARY } from "./accountStyles";

// Two-factor sign-in: a 6-digit code emailed to the customer after their
// password. Turning it on or off re-checks the current password. When the store
// requires a code from every customer it is always on, and shown as such.
export default function TwoFactorCard({ customer, required, notify }) {
  const [enabled, setEnabled] = useState(Boolean(customer.twoFactorEnabled) || required);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (savingRef.current) return;
    if (!password) {
      setError("Enter your current password to confirm.");
      return;
    }

    const next = !enabled;
    savingRef.current = true;
    setSaving(true);
    const result = await requestJson("PATCH", "/api/account/two-factor", { enabled: next, currentPassword: password });
    savingRef.current = false;
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPassword(""); // never leave a password sitting in the form
    setError("");
    setEnabled(next);
    notify(next ? "Two-factor authentication is on" : "Two-factor authentication is off", "success");
  }

  return (
    <SettingsCard
      id="two-factor"
      title="Two-factor authentication"
      description="When you sign in, we email you a 6-digit code to enter after your password. It protects your account even if your password is stolen."
    >
      <p className="flex items-center gap-2 text-[14px] text-[#333333]">
        <span className="font-semibold">Status:</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
            enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {enabled ? "On" : "Off"}
        </span>
      </p>

      {required ? (
        <p className="mt-4 max-w-2xl text-[14px] text-gray-500">
          This store requires a sign-in code from every customer, so two-factor authentication can&apos;t be turned off.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-5">
          <div className="max-w-sm">
            <PasswordInput
              id="two-factor-password"
              label="Current password"
              error={error}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
              autoComplete="current-password"
            />
          </div>
          <div className="mt-6">
            <button type="submit" disabled={saving} className={enabled ? BTN_DANGER : BTN_PRIMARY}>
              {saving ? "Saving…" : enabled ? "Turn off two-factor authentication" : "Turn on two-factor authentication"}
            </button>
          </div>
        </form>
      )}
    </SettingsCard>
  );
}
