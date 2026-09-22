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
  ORDER_STATUSES,
  DEFAULT_ORDERS_SETTINGS,
  toFormSettings,
  toSavePayload,
  validateOrdersSettingsForm,
} from "./helpers";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function OrdersSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_ORDERS_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const orderNumberPrefixInputRef = useRef(null);
  const startingOrderNumberInputRef = useRef(null);
  const autoCancelHoursInputRef = useRef(null);

  const fieldRefs = {
    orderNumberPrefix: orderNumberPrefixInputRef,
    startingOrderNumber: startingOrderNumberInputRef,
    autoCancelHours: autoCancelHoursInputRef,
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
      const res = await fetch("/api/settings/orders");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load order settings");
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
    const result = validateOrdersSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save order settings");
      setSettings(toFormSettings(json.data));
      showToast("Orders settings saved");
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
        icon="shopping-bag"
        title="Orders"
        onDiscard={handleDiscard}
        onSave={handleSave}
        saving={saving}
        disabled={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Order Numbering">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-order-number-prefix"
                label="Order Number Prefix"
                value={settings.orderNumberPrefix}
                onChange={(value) => setField("orderNumberPrefix", value)}
                placeholder="SMB-"
                error={errors.orderNumberPrefix}
                inputRef={orderNumberPrefixInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
              <TextField
                id="f-starting-order-number"
                label="Starting Order Number"
                type="number"
                value={settings.startingOrderNumber}
                onChange={(value) => setField("startingOrderNumber", value)}
                placeholder="10000"
                error={errors.startingOrderNumber}
                inputRef={startingOrderNumberInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
            </div>
          </SectionCard>

          <SectionCard title="Order Rules">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-auto-cancel-hours"
                label="Auto-cancel Unpaid Orders After (hours)"
                type="number"
                value={settings.autoCancelHours}
                onChange={(value) => setField("autoCancelHours", value)}
                placeholder="24"
                hint="Minimum 24 hours."
                error={errors.autoCancelHours}
                inputRef={autoCancelHoursInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
              <SelectField
                id="f-default-order-status"
                label="Default Order Status"
                value={settings.defaultOrderStatus}
                options={ORDER_STATUSES}
                onChange={(value) => setField("defaultOrderStatus", value)}
              />
            </div>
            <ToggleField
              label="Require order confirmation email before fulfillment"
              checked={settings.requireConfirmationEmail}
              onChange={(value) => setField("requireConfirmationEmail", value)}
              disabled={loading}
            />
            <ToggleField
              label="Allow order edits after placement"
              checked={settings.allowOrderEdits}
              onChange={(value) => setField("allowOrderEdits", value)}
              disabled={loading}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="shopping-bag"
            title="About Order Settings"
            points={[
              "The order number prefix and starting number apply to all newly placed orders.",
              "Unpaid orders past the auto-cancel window are automatically moved to a cancelled state.",
              "Allowing order edits lets staff adjust an order after it has already been placed.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
