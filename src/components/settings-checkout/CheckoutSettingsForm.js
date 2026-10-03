"use client";

import { useEffect, useRef, useState } from "react";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { getCurrencySymbol } from "@/lib/currency";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/add-product/Toast";
import { DEFAULT_CHECKOUT_SETTINGS, toFormSettings, toSavePayload, validateCheckoutSettingsForm } from "./helpers";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function CheckoutSettingsForm() {
  const { currency } = useGeneralSettings();
  const symbol = getCurrencySymbol(currency);
  const [settings, setSettings] = useState(DEFAULT_CHECKOUT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const minimumOrderInputRef = useRef(null);
  const reminderDelayInputRef = useRef(null);

  const fieldRefs = {
    minimumOrderAmount: minimumOrderInputRef,
    reminderDelayHours: reminderDelayInputRef,
  };

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), TOAST_AUTO_DISMISS_MS);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/checkout");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load checkout settings");
      setSettings(toFormSettings(json.data));
      setErrors({});
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSave() {
    const result = validateCheckoutSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      fieldRefs[result.firstErrorField]?.current?.focus();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/checkout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save checkout settings");
      setSettings(toFormSettings(json.data));
      showToast("Checkout settings saved");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and reload your saved settings?")) return;
    loadSettings();
  }

  return (
    <>
      <PageToolbar icon="check-circle" title="Checkout" onDiscard={handleDiscard} onSave={handleSave} saving={saving} disabled={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Checkout Options">
            <ToggleField
              label="Allow guest checkout"
              checked={settings.allowGuestCheckout}
              onChange={(value) => setField("allowGuestCheckout", value)}
              disabled={loading}
            />
            <ToggleField
              label="Require phone number at checkout"
              checked={settings.requirePhone}
              onChange={(value) => setField("requirePhone", value)}
              disabled={loading}
            />
            <ToggleField
              label="Require terms & conditions acceptance"
              checked={settings.requireTerms}
              onChange={(value) => setField("requireTerms", value)}
              disabled={loading}
            />
            <TextField
              id="f-min-order-amount"
              label={`Minimum Order Amount (${symbol})`}
              type="number"
              value={settings.minimumOrderAmount}
              onChange={(value) => setField("minimumOrderAmount", value)}
              placeholder="0"
              error={errors.minimumOrderAmount}
              inputRef={minimumOrderInputRef}
              onEnter={handleSave}
              disabled={loading}
            />
          </SectionCard>

          <SectionCard title="Abandoned Carts">
            <ToggleField
              label="Send abandoned cart reminder emails"
              checked={settings.sendAbandonedCartEmails}
              onChange={(value) => setField("sendAbandonedCartEmails", value)}
              disabled={loading}
            />
            <TextField
              id="f-reminder-delay"
              label="Reminder Delay (hours)"
              type="number"
              value={settings.reminderDelayHours}
              onChange={(value) => setField("reminderDelayHours", value)}
              placeholder="4"
              error={errors.reminderDelayHours}
              inputRef={reminderDelayInputRef}
              onEnter={handleSave}
              disabled={loading}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="check-circle"
            title="About Checkout Settings"
            points={[
              "Guest checkout lets customers buy without creating an account. Turn it off and the storefront checkout asks every customer to sign in or create an account first.",
              "Abandoned cart emails are sent after the configured delay to recover lost sales.",
              "Requiring terms acceptance helps protect your store from disputes.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
