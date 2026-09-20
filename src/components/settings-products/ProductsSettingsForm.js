"use client";

import { useEffect, useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "./Toast";
import {
  PRODUCT_STATUSES,
  WEIGHT_UNITS,
  DEFAULT_PRODUCTS_SETTINGS,
  toFormSettings,
  toSavePayload,
  validateProductsSettingsForm,
} from "./helpers";

export default function ProductsSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_PRODUCTS_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const skuPrefixInputRef = useRef(null);
  const lowStockThresholdInputRef = useRef(null);

  const fieldRefs = {
    skuPrefix: skuPrefixInputRef,
    lowStockThreshold: lowStockThresholdInputRef,
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
      const res = await fetch("/api/settings/products");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load product settings");
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
    const result = validateProductsSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save product settings");
      setSettings(toFormSettings(json.data));
      showToast("Products settings saved");
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
        icon="layers"
        title="Products"
        onDiscard={handleDiscard}
        onSave={handleSave}
        saving={saving}
        disabled={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Product Defaults">
            <TextField
              id="f-sku-prefix"
              label="SKU Prefix"
              value={settings.skuPrefix}
              onChange={(value) => setField("skuPrefix", value)}
              placeholder="SMB-"
              error={errors.skuPrefix}
              inputRef={skuPrefixInputRef}
              onEnter={handleSave}
              disabled={loading}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="f-default-status"
                label="Default Product Status"
                value={settings.defaultStatus}
                options={PRODUCT_STATUSES}
                onChange={(value) => setField("defaultStatus", value)}
              />
              <SelectField
                id="f-weight-unit"
                label="Default Weight Unit"
                value={settings.defaultWeightUnit}
                options={WEIGHT_UNITS}
                onChange={(value) => setField("defaultWeightUnit", value)}
              />
            </div>
          </SectionCard>

          <SectionCard title="Catalog Behavior">
            <ToggleField
              label="Allow backorders"
              checked={settings.allowBackorders}
              onChange={(value) => setField("allowBackorders", value)}
              disabled={loading}
            />
            <ToggleField
              label="Allow customer reviews"
              checked={settings.allowReviews}
              onChange={(value) => setField("allowReviews", value)}
              disabled={loading}
            />
            <ToggleField
              label="Show low-stock badge on product page"
              checked={settings.showLowStockBadge}
              onChange={(value) => setField("showLowStockBadge", value)}
              disabled={loading}
            />
            <TextField
              id="f-low-stock-threshold"
              label="Low Stock Threshold"
              type="number"
              value={settings.lowStockThreshold}
              onChange={(value) => setField("lowStockThreshold", value)}
              placeholder="5"
              error={errors.lowStockThreshold}
              inputRef={lowStockThresholdInputRef}
              onEnter={handleSave}
              disabled={loading}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="layers"
            title="About Product Settings"
            points={[
              "SKU prefixes help you keep product codes consistent across your catalog.",
              "New products default to the status and weight unit set here unless changed manually.",
              "Low-stock badges alert customers before an item sells out completely.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
