"use client";

import { useRef, useState } from "react";
import { DEFAULT_GENERAL_SETTINGS, isValidEmail } from "./helpers";
import PageToolbar from "./PageToolbar";
import StoreIdentitySection from "./StoreIdentitySection";
import StoreContactSection from "./StoreContactSection";
import LocalizationSidebar from "./LocalizationSidebar";
import Toast from "./Toast";

export default function GeneralSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_GENERAL_SETTINGS);
  const [emailError, setEmailError] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false });

  const toastTimerRef = useRef(null);

  function showToast(message) {
    setToast({ message, visible: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function setField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  function handleLogoPicked(file) {
    setField("logo", { url: URL.createObjectURL(file), name: file.name });
  }

  function handleFaviconPicked(file) {
    setField("favicon", { url: URL.createObjectURL(file), name: file.name });
  }

  function handleSave() {
    if (!isValidEmail(settings.storeEmail)) {
      setEmailError(true);
      showToast("Enter a valid store email address before saving");
      return;
    }
    setEmailError(false);
    showToast("General settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_GENERAL_SETTINGS);
    setEmailError(false);
  }

  return (
    <>
      <PageToolbar onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <StoreIdentitySection
            storeName={settings.storeName}
            logo={settings.logo}
            favicon={settings.favicon}
            onFieldChange={setField}
            onLogoPicked={handleLogoPicked}
            onLogoRemoved={() => setField("logo", null)}
            onFaviconPicked={handleFaviconPicked}
            onFaviconRemoved={() => setField("favicon", null)}
          />

          <StoreContactSection
            storeEmail={settings.storeEmail}
            emailError={emailError}
            phone={settings.phone}
            address={settings.address}
            country={settings.country}
            state={settings.state}
            city={settings.city}
            onFieldChange={setField}
          />
        </div>

        <div className="space-y-6">
          <LocalizationSidebar
            timezone={settings.timezone}
            dateTimeFormat={settings.dateTimeFormat}
            language={settings.language}
            currency={settings.currency}
            onFieldChange={setField}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
