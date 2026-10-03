"use client";

import { useEffect, useRef, useState } from "react";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { getCurrencySymbol } from "@/lib/currency";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import SelectField from "@/components/settings-shared/SelectField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/add-product/Toast";
import {
  DEFAULT_PAYMENT_SETTINGS,
  PAYMENT_GATEWAYS,
  selectedGateways,
  setGatewaySelected,
  toFormSettings,
  toSavePayload,
  validatePaymentSettingsForm,
} from "./helpers";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function PaymentSettingsForm() {
  const { currency } = useGeneralSettings();
  const symbol = getCurrencySymbol(currency);
  const [settings, setSettings] = useState(DEFAULT_PAYMENT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  // For the webhook URL shown under the Stripe signing secret: only known in the browser.
  const [origin, setOrigin] = useState("");

  const toastTimerRef = useRef(null);
  const gatewaysGroupRef = useRef(null);
  const stripePublishableKeyInputRef = useRef(null);
  const stripeSecretKeyInputRef = useRef(null);
  const stripeWebhookSecretInputRef = useRef(null);
  const paypalEnvironmentInputRef = useRef(null);
  const transactionFeeInputRef = useRef(null);
  const codMinOrderInputRef = useRef(null);

  const fieldRefs = {
    gateways: gatewaysGroupRef,
    stripePublishableKey: stripePublishableKeyInputRef,
    stripeSecretKey: stripeSecretKeyInputRef,
    stripeWebhookSecret: stripeWebhookSecretInputRef,
    paypalEnvironment: paypalEnvironmentInputRef,
    transactionFee: transactionFeeInputRef,
    codMinOrder: codMinOrderInputRef,
  };

  const activeGateways = selectedGateways(settings);

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
      const loaded = toFormSettings(json.data);
      setSettings(loaded);
      // A saved selection that breaks the gateway rules (stored before they
      // existed) is flagged straight away rather than on the first failed save.
      setErrors({ gateways: validatePaymentSettingsForm(loaded).errors.gateways });
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function clearGatewaysError() {
    setErrors((prev) => (prev.gateways ? { ...prev, gateways: undefined } : prev));
  }

  function handleGatewayToggle(gatewayId, selected) {
    setSettings((prev) => setGatewaySelected(prev, gatewayId, selected));
    clearGatewaysError();
  }

  function handleCodToggle(selected) {
    setField("codEnabled", selected);
    clearGatewaysError();
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
            <p id="payment-gateways-hint" className="text-xs text-slate-400 -mt-2">
              Choose one online gateway: Stripe, PayPal or Razorpay. Cash on Delivery can be selected on its own or
              alongside it. At least one payment method is required.
            </p>
            <div
              ref={gatewaysGroupRef}
              tabIndex={-1}
              role="group"
              aria-label="Payment gateways"
              aria-describedby={`payment-gateways-hint${errors.gateways ? " payment-gateways-error" : ""}`}
              className="outline-none"
            >
              {PAYMENT_GATEWAYS.map((gateway) => (
                <ToggleField
                  key={gateway.id}
                  label={gateway.label}
                  checked={settings[gateway.enabledKey]}
                  onChange={(selected) => handleGatewayToggle(gateway.id, selected)}
                  disabled={loading}
                />
              ))}
              <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-white/5">
                <ToggleField
                  label="Cash on Delivery (COD)"
                  checked={settings.codEnabled}
                  onChange={handleCodToggle}
                  disabled={loading}
                />
              </div>
            </div>
            {errors.gateways && (
              <p id="payment-gateways-error" role="alert" className="text-xs text-error">
                {errors.gateways}
              </p>
            )}
          </SectionCard>

          {activeGateways.map((gateway) => (
            <SectionCard key={gateway.id} title={`${gateway.label} Details`}>
              <p className="text-xs text-slate-400 -mt-2">{gateway.help}</p>
              {gateway.fields.map((field) =>
                field.options ? (
                  <SelectField
                    key={field.key}
                    id={field.id}
                    label={field.label}
                    value={settings[field.key]}
                    options={field.options}
                    onChange={(value) => setField(field.key, value)}
                    error={errors[field.key]}
                    inputRef={fieldRefs[field.key]}
                    onEnter={handleSave}
                    disabled={loading}
                  />
                ) : (
                  <TextField
                    key={field.key}
                    id={field.id}
                    label={field.label}
                    type={field.secret ? "password" : "text"}
                    value={settings[field.key]}
                    onChange={(value) => setField(field.key, value)}
                    placeholder={field.placeholder}
                    hint={typeof field.hint === "function" ? field.hint(origin) : field.hint}
                    error={errors[field.key]}
                    inputRef={fieldRefs[field.key]}
                    autoComplete={field.secret ? "new-password" : "off"}
                    onEnter={handleSave}
                    disabled={loading}
                  />
                ),
              )}
            </SectionCard>
          ))}

          <SectionCard title="Payment Options">
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
                label={`Minimum Order for COD (${symbol})`}
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
              "Only one online gateway can be on at a time. Cash on Delivery can be on with it or by itself, and at least one payment method must stay on.",
              "Each gateway keeps its own keys. They are kept when you switch to another gateway, so you do not need to re-enter them if you switch back.",
              "Gateway keys are saved to the database in plain text for now. Encrypt them at rest before taking real payments.",
              "Disabling a payment method hides it from customers at checkout immediately.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
