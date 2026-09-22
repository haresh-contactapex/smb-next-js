"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_GENERAL_SETTINGS,
  toFormSettings,
  toSavePayload,
  updateLocationField,
  validateGeneralSettingsForm,
} from "./helpers";
import PageToolbar from "./PageToolbar";
import StoreIdentitySection from "./StoreIdentitySection";
import StoreContactSection from "./StoreContactSection";
import LocalizationSidebar from "./LocalizationSidebar";
import Toast from "@/components/add-product/Toast";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function GeneralSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_GENERAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const storeNameInputRef = useRef(null);
  const identitySectionRef = useRef(null);
  const storeEmailInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const countryInputRef = useRef(null);
  const stateInputRef = useRef(null);
  const cityInputRef = useRef(null);
  const zipInputRef = useRef(null);

  const fieldRefs = {
    storeName: storeNameInputRef,
    storeEmail: storeEmailInputRef,
    phone: phoneInputRef,
    address: addressInputRef,
    country: countryInputRef,
    state: stateInputRef,
    city: cityInputRef,
    zip: zipInputRef,
  };

  function focusField(field) {
    if (field === "logo" || field === "favicon") {
      identitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
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
      const res = await fetch("/api/settings/general");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load general settings");
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
    setSettings((prev) =>
      field === "country" || field === "state" ? updateLocationField(prev, field, value) : { ...prev, [field]: value }
    );
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function uploadImage(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/media", { method: "POST", body: formData });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Failed to upload image");
    return { url: json.data.url, name: json.data.fileName };
  }

  async function handleLogoPicked(file) {
    try {
      const uploaded = await uploadImage(file);
      setField("logo", uploaded);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function handleFaviconPicked(file) {
    try {
      const uploaded = await uploadImage(file);
      setField("favicon", uploaded);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function handleSave() {
    const result = validateGeneralSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save general settings");
      setSettings(toFormSettings(json.data));
      showToast("General settings saved");
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
      <PageToolbar onDiscard={handleDiscard} onSave={handleSave} saving={saving} disabled={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <StoreIdentitySection
            sectionRef={identitySectionRef}
            storeName={settings.storeName}
            storeNameError={errors.storeName}
            storeNameInputRef={storeNameInputRef}
            logo={settings.logo}
            logoError={errors.logo}
            favicon={settings.favicon}
            faviconError={errors.favicon}
            onFieldChange={setField}
            onLogoPicked={handleLogoPicked}
            onLogoRemoved={() => setField("logo", null)}
            onFaviconPicked={handleFaviconPicked}
            onFaviconRemoved={() => setField("favicon", null)}
            onEnter={handleSave}
          />

          <StoreContactSection
            storeEmail={settings.storeEmail}
            storeEmailError={errors.storeEmail}
            storeEmailInputRef={storeEmailInputRef}
            phone={settings.phone}
            phoneError={errors.phone}
            phoneInputRef={phoneInputRef}
            address={settings.address}
            addressError={errors.address}
            addressInputRef={addressInputRef}
            country={settings.country}
            countryError={errors.country}
            countryInputRef={countryInputRef}
            state={settings.state}
            stateError={errors.state}
            stateInputRef={stateInputRef}
            city={settings.city}
            cityError={errors.city}
            cityInputRef={cityInputRef}
            zip={settings.zip}
            zipError={errors.zip}
            zipInputRef={zipInputRef}
            onFieldChange={setField}
            onEnter={handleSave}
          />
        </div>

        <div className="space-y-6">
          <LocalizationSidebar
            timezone={settings.timezone}
            dateTimeFormat={settings.dateTimeFormat}
            language={settings.language}
            onFieldChange={setField}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
