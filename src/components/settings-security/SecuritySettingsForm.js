"use client";

import { useEffect, useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import TextAreaField from "@/components/settings-shared/TextAreaField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "./Toast";
import { DEFAULT_SECURITY_SETTINGS, toFormSettings, toSavePayload, validateSecuritySettingsForm } from "./helpers";

export default function SecuritySettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_SECURITY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const sessionTimeoutInputRef = useRef(null);
  const passwordExpiryInputRef = useRef(null);
  const maxLoginAttemptsInputRef = useRef(null);
  const ipAllowlistInputRef = useRef(null);

  const fieldRefs = {
    sessionTimeoutMinutes: sessionTimeoutInputRef,
    passwordExpiryDays: passwordExpiryInputRef,
    maxLoginAttempts: maxLoginAttemptsInputRef,
    ipAllowlist: ipAllowlistInputRef,
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
      const res = await fetch("/api/settings/security");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load security settings");
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
    const result = validateSecuritySettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save security settings");
      setSettings(toFormSettings(json.data));
      showToast("Security settings saved");
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
      <PageToolbar icon="lock" title="Security" onDiscard={handleDiscard} onSave={handleSave} saving={saving} disabled={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Authentication">
            <ToggleField
              label="Require two-factor authentication for all admins"
              description="Admins must verify sign-in with a second factor before accessing the dashboard."
              checked={settings.requireTwoFactorAuth}
              onChange={(value) => setField("requireTwoFactorAuth", value)}
              disabled={loading}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-session-timeout"
                label="Session Timeout (minutes)"
                type="number"
                value={settings.sessionTimeoutMinutes}
                onChange={(value) => setField("sessionTimeoutMinutes", value)}
                placeholder="30"
                error={errors.sessionTimeoutMinutes}
                inputRef={sessionTimeoutInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
              <TextField
                id="f-password-expiry"
                label="Password Expiry (days)"
                type="number"
                value={settings.passwordExpiryDays}
                onChange={(value) => setField("passwordExpiryDays", value)}
                placeholder="90"
                error={errors.passwordExpiryDays}
                inputRef={passwordExpiryInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
            </div>
            <TextField
              id="f-max-login-attempts"
              label="Max Login Attempts Before Lockout"
              type="number"
              value={settings.maxLoginAttempts}
              onChange={(value) => setField("maxLoginAttempts", value)}
              placeholder="5"
              error={errors.maxLoginAttempts}
              inputRef={maxLoginAttemptsInputRef}
              onEnter={handleSave}
              disabled={loading}
            />
          </SectionCard>

          <SectionCard title="Access Control">
            <TextAreaField
              id="f-ip-allowlist"
              label="IP Allowlist (one per line)"
              rows={3}
              value={settings.ipAllowlist}
              onChange={(value) => setField("ipAllowlist", value)}
              hint="Leave empty to allow all IPs."
              error={errors.ipAllowlist}
              inputRef={ipAllowlistInputRef}
              disabled={loading}
            />
            <ToggleField
              label="Enable reCAPTCHA on login and checkout"
              description="Show a reCAPTCHA challenge to help block automated bots and abuse."
              checked={settings.enableRecaptcha}
              onChange={(value) => setField("enableRecaptcha", value)}
              disabled={loading}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="lock"
            title="About Security Settings"
            points={[
              "Two-factor authentication significantly reduces the risk of unauthorized admin access.",
              "The IP allowlist restricts admin dashboard access to trusted networks — leave empty to allow all.",
              "Session timeout and login attempt limits help protect against stale sessions and brute-force attacks.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
