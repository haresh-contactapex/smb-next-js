"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import TextAreaField from "@/components/settings-shared/TextAreaField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const DEFAULT_SETTINGS = {
  requireTwoFactorAuth: false,
  sessionTimeoutMinutes: "",
  passwordExpiryDays: "",
  maxLoginAttempts: "",
  ipAllowlist: "",
  enableRecaptcha: true,
};

export default function SecuritySettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
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

  function handleSave() {
    showToast("Security settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="lock" title="Security" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Authentication">
            <ToggleField
              label="Require two-factor authentication for all admins"
              description="Admins must verify sign-in with a second factor before accessing the dashboard."
              checked={settings.requireTwoFactorAuth}
              onChange={(value) => setField("requireTwoFactorAuth", value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-session-timeout"
                label="Session Timeout (minutes)"
                type="number"
                value={settings.sessionTimeoutMinutes}
                onChange={(value) => setField("sessionTimeoutMinutes", value)}
                placeholder="30"
              />
              <TextField
                id="f-password-expiry"
                label="Password Expiry (days)"
                type="number"
                value={settings.passwordExpiryDays}
                onChange={(value) => setField("passwordExpiryDays", value)}
                placeholder="90"
              />
            </div>
            <TextField
              id="f-max-login-attempts"
              label="Max Login Attempts Before Lockout"
              type="number"
              value={settings.maxLoginAttempts}
              onChange={(value) => setField("maxLoginAttempts", value)}
              placeholder="5"
            />
          </SectionCard>

          <SectionCard title="Access Control">
            <TextAreaField
              id="f-ip-allowlist"
              label="IP Allowlist (one per line)"
              rows={3}
              value={settings.ipAllowlist}
              onChange={(value) => setField("ipAllowlist", value)}
            />
            <ToggleField
              label="Enable reCAPTCHA on login and checkout"
              description="Show a reCAPTCHA challenge to help block automated bots and abuse."
              checked={settings.enableRecaptcha}
              onChange={(value) => setField("enableRecaptcha", value)}
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

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
