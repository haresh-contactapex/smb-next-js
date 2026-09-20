"use client";

import { useEffect, useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "./Toast";
import { formatUsPhone } from "@/lib/phone";
import {
  BUSINESS_TYPES,
  DEFAULT_STORE_SETTINGS,
  toFormSettings,
  toSavePayload,
  validateStoreSettingsForm,
} from "./helpers";

export default function StoreSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const legalBusinessNameInputRef = useRef(null);
  const storeUrlInputRef = useRef(null);
  const supportEmailInputRef = useRef(null);
  const supportPhoneInputRef = useRef(null);

  const fieldRefs = {
    legalBusinessName: legalBusinessNameInputRef,
    storeUrl: storeUrlInputRef,
    supportEmail: supportEmailInputRef,
    supportPhone: supportPhoneInputRef,
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
      const res = await fetch("/api/settings/store");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load store settings");
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
    const result = validateStoreSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save store settings");
      setSettings(toFormSettings(json.data));
      showToast("Store settings saved");
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
        icon="package"
        title="Store"
        onDiscard={handleDiscard}
        onSave={handleSave}
        saving={saving}
        disabled={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Store Details">
            <TextField
              id="f-legal-business-name"
              label="Legal Business Name"
              value={settings.legalBusinessName}
              onChange={(value) => setField("legalBusinessName", value)}
              error={errors.legalBusinessName}
              inputRef={legalBusinessNameInputRef}
              onEnter={handleSave}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="f-business-type"
                label="Business Type"
                value={settings.businessType}
                options={BUSINESS_TYPES}
                onChange={(value) => setField("businessType", value)}
              />
              <TextField
                id="f-store-url"
                label="Store URL"
                value={settings.storeUrl}
                onChange={(value) => setField("storeUrl", value)}
                placeholder="https://shopmyband.com"
                error={errors.storeUrl}
                inputRef={storeUrlInputRef}
                onEnter={handleSave}
              />
            </div>
            <TextField
              id="f-tax-id"
              label="Business Registration / Tax ID"
              value={settings.taxId}
              onChange={(value) => setField("taxId", value)}
              onEnter={handleSave}
            />
          </SectionCard>

          <SectionCard title="Support">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-support-email"
                label="Support Email"
                type="email"
                value={settings.supportEmail}
                onChange={(value) => setField("supportEmail", value)}
                error={errors.supportEmail}
                inputRef={supportEmailInputRef}
                onEnter={handleSave}
              />
              <TextField
                id="f-support-phone"
                label="Support Phone"
                type="tel"
                value={settings.supportPhone}
                onChange={(value) => setField("supportPhone", formatUsPhone(value))}
                placeholder="(555) 000-0000"
                error={errors.supportPhone}
                inputRef={supportPhoneInputRef}
                onEnter={handleSave}
              />
            </div>
            <TextField
              id="f-support-hours"
              label="Support Hours"
              value={settings.supportHours}
              onChange={(value) => setField("supportHours", value)}
              placeholder="Mon–Fri, 9am–6pm EST"
              onEnter={handleSave}
            />
            <ToggleField
              label="Store is live"
              description="When off, the storefront shows a coming-soon page instead of products."
              checked={settings.storeIsLive}
              onChange={(value) => setField("storeIsLive", value)}
              disabled={loading}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="package"
            title="About Store Settings"
            points={[
              "Your legal business name and tax ID appear on customer invoices and receipts.",
              "Support contact details are shown in the storefront footer and order confirmation emails.",
              "Taking the store offline shows customers a coming-soon page instead of blocking checkout errors.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
