"use client";

import { useEffect, useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/add-product/Toast";
import { DEFAULT_INTEGRATIONS_SETTINGS, toFormSettings, toSavePayload, validateIntegrationsSettingsForm } from "./helpers";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function IntegrationsSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_INTEGRATIONS_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const googleAnalyticsIdInputRef = useRef(null);
  const metaPixelIdInputRef = useRef(null);
  const mailchimpApiKeyInputRef = useRef(null);
  const googleRecaptchaSiteKeyInputRef = useRef(null);
  const googleRecaptchaSecretKeyInputRef = useRef(null);

  const fieldRefs = {
    googleAnalyticsId: googleAnalyticsIdInputRef,
    metaPixelId: metaPixelIdInputRef,
    mailchimpApiKey: mailchimpApiKeyInputRef,
    googleRecaptchaSiteKey: googleRecaptchaSiteKeyInputRef,
    googleRecaptchaSecretKey: googleRecaptchaSecretKeyInputRef,
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
      const res = await fetch("/api/settings/integrations");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load integrations settings");
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
    const result = validateIntegrationsSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save integrations settings");
      setSettings(toFormSettings(json.data));
      showToast("Integrations settings saved");
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
      <PageToolbar icon="link" title="Integrations" onDiscard={handleDiscard} onSave={handleSave} saving={saving} disabled={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Analytics & Marketing">
            <ToggleField
              label="Google Analytics"
              checked={settings.googleAnalyticsEnabled}
              onChange={(value) => setField("googleAnalyticsEnabled", value)}
              disabled={loading}
            />
            <TextField
              id="f-ga-id"
              label="Measurement ID"
              value={settings.googleAnalyticsId}
              onChange={(value) => setField("googleAnalyticsId", value)}
              placeholder="G-XXXXXXXXXX"
              error={errors.googleAnalyticsId}
              inputRef={googleAnalyticsIdInputRef}
              onEnter={handleSave}
              disabled={loading}
            />

            <ToggleField
              label="Meta / Facebook Pixel"
              checked={settings.metaPixelEnabled}
              onChange={(value) => setField("metaPixelEnabled", value)}
              disabled={loading}
            />
            <TextField
              id="f-meta-pixel-id"
              label="Pixel ID"
              value={settings.metaPixelId}
              onChange={(value) => setField("metaPixelId", value)}
              placeholder="123456789012345"
              error={errors.metaPixelId}
              inputRef={metaPixelIdInputRef}
              onEnter={handleSave}
              disabled={loading}
            />

            <ToggleField
              label="Mailchimp"
              checked={settings.mailchimpEnabled}
              onChange={(value) => setField("mailchimpEnabled", value)}
              disabled={loading}
            />
            <TextField
              id="f-mailchimp-key"
              label="API Key"
              value={settings.mailchimpApiKey}
              onChange={(value) => setField("mailchimpApiKey", value)}
              placeholder="Enter API key"
              error={errors.mailchimpApiKey}
              inputRef={mailchimpApiKeyInputRef}
              onEnter={handleSave}
              disabled={loading}
            />

            <ToggleField
              label="Google reCAPTCHA"
              checked={settings.googleRecaptchaEnabled}
              onChange={(value) => setField("googleRecaptchaEnabled", value)}
              disabled={loading}
            />
            <TextField
              id="f-google-recaptcha-site-key"
              label="Site Key"
              value={settings.googleRecaptchaSiteKey}
              onChange={(value) => setField("googleRecaptchaSiteKey", value)}
              placeholder="Enter reCAPTCHA site key"
              error={errors.googleRecaptchaSiteKey}
              inputRef={googleRecaptchaSiteKeyInputRef}
              onEnter={handleSave}
              disabled={loading}
            />
            <TextField
              id="f-google-recaptcha-secret-key"
              label="Secret Key"
              value={settings.googleRecaptchaSecretKey}
              onChange={(value) => setField("googleRecaptchaSecretKey", value)}
              placeholder="Enter reCAPTCHA secret key"
              error={errors.googleRecaptchaSecretKey}
              inputRef={googleRecaptchaSecretKeyInputRef}
              onEnter={handleSave}
              disabled={loading}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="link"
            title="About Integrations"
            points={[
              "Connect third-party analytics and marketing tools to track storefront activity.",
              "API keys and site keys are only used by the integrations you enable above.",
              "Disabling an integration stops new data from being sent, but does not delete existing data.",
              "Google reCAPTCHA's Site Key and Secret Key take effect across the whole site (login, register, forgot/reset password) as soon as they're saved here, replacing the keys in .env.local while this integration is enabled.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
