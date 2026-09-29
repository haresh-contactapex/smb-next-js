"use client";

import { useEffect, useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/add-product/Toast";
import {
  DEFAULT_PAYMENT_SETTINGS,
  toFormSettings,
  toSavePayload,
  validatePaymentSettingsForm,
} from "./helpers";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function PaymentSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_PAYMENT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const transactionFeeInputRef = useRef(null);
  const codMinOrderInputRef = useRef(null);

  const fieldRefs = {
    transactionFee: transactionFeeInputRef,
    codMinOrder: codMinOrderInputRef,
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
      const res = await fetch("/api/settings/payment");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load payment settings");
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
    const result = validatePaymentSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      fieldRefs[result.firstErrorField]?.current?.focus();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save payment settings");
      setSettings(toFormSettings(json.data));
      showToast("Payment settings saved");
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
      <PageToolbar
        icon="credit-card"
        title="Payment"
        onDiscard={handleDiscard}
        onSave={handleSave}
        saving={saving}
        disabled={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Payment Gateways">
            <ToggleField
              label="Stripe"
              checked={settings.stripeEnabled}
              onChange={(value) => setField("stripeEnabled", value)}
            />
            <ToggleField
              label="PayPal"
              checked={settings.paypalEnabled}
              onChange={(value) => setField("paypalEnabled", value)}
            />
            <ToggleField
              label="Razorpay"
              checked={settings.razorpayEnabled}
              onChange={(value) => setField("razorpayEnabled", value)}
            />
            <ToggleField
              label="Cash on Delivery (COD)"
              checked={settings.codEnabled}
              onChange={(value) => setField("codEnabled", value)}
            />
          </SectionCard>

          <SectionCard title="Gateway Configuration">
            <TextField
              id="f-public-key"
              label="Publishable / Public Key"
              value={settings.publicKey}
              onChange={(value) => setField("publicKey", value)}
              disabled={loading}
            />
            <TextField
              id="f-secret-key"
              label="Secret Key"
              type="password"
              value={settings.secretKey}
              onChange={(value) => setField("secretKey", value)}
              disabled={loading}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-transaction-fee"
                label="Transaction Fee (%)"
                type="number"
                value={settings.transactionFee}
                onChange={(value) => setField("transactionFee", value)}
                placeholder="2.9"
                error={errors.transactionFee}
                inputRef={transactionFeeInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
              <TextField
                id="f-cod-min-order"
                label="Minimum Order for COD"
                type="number"
                value={settings.codMinOrder}
                onChange={(value) => setField("codMinOrder", value)}
                placeholder="0"
                error={errors.codMinOrder}
                inputRef={codMinOrderInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
            </div>
            <ToggleField
              label="Auto-capture payments"
              description="Capture funds immediately on order placement instead of only authorizing."
              checked={settings.autoCapture}
              onChange={(value) => setField("autoCapture", value)}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="credit-card"
            title="About Payment Gateways"
            points={[
              "Gateway keys are saved to the database in plain text for now. Encrypt them at rest before taking real payments.",
              "The dashboard marks Payment as connected once Cash on Delivery is on, or a gateway is on with both keys entered.",
              "Disabling a gateway hides it from customers at checkout immediately.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
