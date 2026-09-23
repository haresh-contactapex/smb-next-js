"use client";

import { useEffect, useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/add-product/Toast";
import {
  CARRIERS,
  WEIGHT_UNITS,
  DIMENSION_UNITS,
  DEFAULT_SHIPPING_SETTINGS,
  toFormSettings,
  toSavePayload,
  validateShippingSettingsForm,
} from "./helpers";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function ShippingSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_SHIPPING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const flatRateFeeInputRef = useRef(null);
  const freeShippingThresholdInputRef = useRef(null);
  const processingTimeDaysInputRef = useRef(null);

  const fieldRefs = {
    flatRateFee: flatRateFeeInputRef,
    freeShippingThreshold: freeShippingThresholdInputRef,
    processingTimeDays: processingTimeDaysInputRef,
  };

  function focusField(field) {
    fieldRefs[field]?.current?.focus();
  }

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      TOAST_AUTO_DISMISS_MS,
    );
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/shipping");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load shipping settings");
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
    const result = validateShippingSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save shipping settings");
      setSettings(toFormSettings(json.data));
      showToast("Shipping settings saved");
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
        icon="truck"
        title="Shipping"
        onDiscard={handleDiscard}
        onSave={handleSave}
        saving={saving}
        disabled={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Shipping Rates">
            <SelectField
              id="f-default-carrier"
              label="Default Carrier"
              value={settings.defaultCarrier}
              options={CARRIERS}
              onChange={(value) => setField("defaultCarrier", value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-flat-rate-fee"
                label="Flat Rate Shipping Fee"
                type="number"
                value={settings.flatRateFee}
                onChange={(value) => setField("flatRateFee", value)}
                placeholder="5.99"
                error={errors.flatRateFee}
                inputRef={flatRateFeeInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
              <TextField
                id="f-free-shipping-threshold"
                label="Free Shipping Threshold"
                type="number"
                value={settings.freeShippingThreshold}
                onChange={(value) => setField("freeShippingThreshold", value)}
                placeholder="75"
                error={errors.freeShippingThreshold}
                inputRef={freeShippingThresholdInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
            </div>
          </SectionCard>

          <SectionCard title="Fulfillment">
            <TextField
              id="f-processing-time"
              label="Order Processing Time (days)"
              type="number"
              value={settings.processingTimeDays}
              onChange={(value) => setField("processingTimeDays", value)}
              placeholder="2"
              error={errors.processingTimeDays}
              inputRef={processingTimeDaysInputRef}
              onEnter={handleSave}
              disabled={loading}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="f-weight-unit"
                label="Weight Unit"
                value={settings.weightUnit}
                options={WEIGHT_UNITS}
                onChange={(value) => setField("weightUnit", value)}
              />
              <SelectField
                id="f-dimension-unit"
                label="Dimension Unit"
                value={settings.dimensionUnit}
                options={DIMENSION_UNITS}
                onChange={(value) => setField("dimensionUnit", value)}
              />
            </div>
            <ToggleField
              label="Enable local pickup"
              checked={settings.localPickupEnabled}
              onChange={(value) => setField("localPickupEnabled", value)}
              disabled={loading}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="truck"
            title="About Shipping"
            points={[
              "The flat rate fee applies to orders under the free shipping threshold.",
              "Processing time is shown to customers at checkout as an estimated dispatch window.",
              "Weight and dimension units are used across product data and carrier rate calculations.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
