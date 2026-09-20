"use client";

import { useEffect, useRef, useState } from "react";
import { CURRENCIES } from "@/data/accountData";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "./Toast";
import {
  CURRENCY_POSITIONS,
  NUMBER_FORMATS,
  DEFAULT_CURRENCY_TAX_SETTINGS,
  toFormSettings,
  toSavePayload,
  validateCurrencyTaxSettingsForm,
} from "./helpers";

export default function CurrencyTaxSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_CURRENCY_TAX_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const defaultTaxRateInputRef = useRef(null);
  const taxRegistrationNumberInputRef = useRef(null);

  const fieldRefs = {
    defaultTaxRate: defaultTaxRateInputRef,
    taxRegistrationNumber: taxRegistrationNumberInputRef,
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
      const res = await fetch("/api/settings/currency-tax");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load currency & tax settings");
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
    const result = validateCurrencyTaxSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/currency-tax", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save currency & tax settings");
      setSettings(toFormSettings(json.data));
      showToast("Currency & tax settings saved");
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
        icon="dollar-sign"
        title="Currency & Tax"
        onDiscard={handleDiscard}
        onSave={handleSave}
        saving={saving}
        disabled={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Currency">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="f-currency"
                label="Default Currency"
                value={settings.currency}
                options={CURRENCIES}
                onChange={(value) => setField("currency", value)}
              />
              <SelectField
                id="f-currency-position"
                label="Currency Position"
                value={settings.currencyPosition}
                options={CURRENCY_POSITIONS}
                onChange={(value) => setField("currencyPosition", value)}
              />
            </div>
            <SelectField
              id="f-number-format"
              label="Number Format"
              value={settings.numberFormat}
              options={NUMBER_FORMATS}
              onChange={(value) => setField("numberFormat", value)}
            />
          </SectionCard>

          <SectionCard title="Tax">
            <ToggleField
              label="Prices include tax"
              description="Product prices are entered and displayed with tax already included."
              checked={settings.pricesIncludeTax}
              onChange={(value) => setField("pricesIncludeTax", value)}
              disabled={loading}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-tax-rate"
                label="Default Tax Rate (%)"
                type="number"
                value={settings.defaultTaxRate}
                onChange={(value) => setField("defaultTaxRate", value)}
                placeholder="8.25"
                error={errors.defaultTaxRate}
                inputRef={defaultTaxRateInputRef}
                onEnter={handleSave}
              />
              <TextField
                id="f-tax-reg-number"
                label="Tax Registration Number"
                value={settings.taxRegistrationNumber}
                onChange={(value) => setField("taxRegistrationNumber", value)}
                placeholder="e.g. VAT / GST / EIN number"
                error={errors.taxRegistrationNumber}
                inputRef={taxRegistrationNumberInputRef}
                onEnter={handleSave}
              />
            </div>
            <ToggleField
              label="Apply tax to shipping"
              description="Charge tax on shipping and handling fees at checkout."
              checked={settings.applyTaxToShipping}
              onChange={(value) => setField("applyTaxToShipping", value)}
              disabled={loading}
            />
            <ToggleField
              label="Enable tax-exempt customer groups"
              description="Allow specific customer groups (e.g. wholesale, non-profit) to be exempted from tax."
              checked={settings.enableTaxExemptGroups}
              onChange={(value) => setField("enableTaxExemptGroups", value)}
              disabled={loading}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="dollar-sign"
            title="About Currency & Tax"
            points={[
              "The default currency is used for all storefront prices unless a customer's region overrides it.",
              "Tax rates set here are a fallback — per-region tax rules can still override them.",
              "Changing the currency does not convert existing product prices automatically.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
