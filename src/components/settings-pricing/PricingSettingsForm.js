"use client";

import { useEffect, useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import TextField from "@/components/settings-shared/TextField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "./Toast";
import {
  ADJUSTMENT_TYPES,
  ADJUSTMENT_DIRECTIONS,
  DEFAULT_PRICING_SETTINGS,
  toFormSettings,
  toSavePayload,
  validatePricingSettingsForm,
} from "./helpers";

export default function PricingSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_PRICING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const adjustmentValueInputRef = useRef(null);

  const fieldRefs = {
    adjustmentValue: adjustmentValueInputRef,
  };

  function focusField(field) {
    fieldRefs[field]?.current?.focus();
  }

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/pricing");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load pricing settings");
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
    const result = validatePricingSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save pricing settings");
      setSettings(toFormSettings(json.data));
      showToast("Pricing settings saved");
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

  async function handleApply() {
    const result = validatePricingSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    const directionWord = settings.adjustmentDirection === "decrease" ? "decrease" : "increase";
    const amountWord =
      settings.adjustmentType === "fixed" ? `$${settings.adjustmentValue}` : `${settings.adjustmentValue}%`;
    if (
      !window.confirm(
        `This will ${directionWord} the price and compare-at price of every product, and every variant's price, by ${amountWord}. This cannot be undone. Continue?`
      )
    ) {
      return;
    }

    setApplying(true);
    try {
      const res = await fetch("/api/settings/pricing/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to apply the price adjustment");
      showToast(
        `Updated ${json.data.updatedProductCount} product(s) and ${json.data.updatedVariantCount} variant(s)`
      );
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <PageToolbar
        icon="percent"
        title="Pricing"
        onDiscard={handleDiscard}
        onSave={handleSave}
        saving={saving}
        disabled={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Price Adjustment">
            <TextField
              id="f-adjustment-value"
              label="Adjustment Value"
              type="number"
              value={settings.adjustmentValue}
              onChange={(value) => setField("adjustmentValue", value)}
              placeholder="0"
              error={errors.adjustmentValue}
              inputRef={adjustmentValueInputRef}
              onEnter={handleSave}
              disabled={loading}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="f-adjustment-type"
                label="Adjustment Type"
                value={settings.adjustmentType}
                options={ADJUSTMENT_TYPES}
                onChange={(value) => setField("adjustmentType", value)}
              />
              <SelectField
                id="f-adjustment-direction"
                label="Adjustment Direction"
                value={settings.adjustmentDirection}
                options={ADJUSTMENT_DIRECTIONS}
                onChange={(value) => setField("adjustmentDirection", value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleApply}
                disabled={loading || applying}
                className="px-4 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {applying ? "Applying…" : "Apply to All Products"}
              </button>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="percent"
            title="About Pricing Settings"
            points={[
              "Choose whether the adjustment applies as a percentage of the price or a fixed amount.",
              "Increase raises product prices; decrease lowers them.",
              "\"Apply to All Products\" immediately recalculates and overwrites the price and compare-at price of every product, plus the price of every variant that has its own — it cannot be undone.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
