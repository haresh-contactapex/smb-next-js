"use client";

import { useEffect, useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import TextAreaField from "@/components/settings-shared/TextAreaField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Icon from "@/components/admin-panel/Icon";
import Toast from "./Toast";
import {
  DEFAULT_EMAIL_SETTINGS,
  MAX_EMAIL_FOOTER_LENGTH,
  SMTP_SOURCE_NOTICES,
  toFormSettings,
  toSavePayload,
  validateEmailSettingsForm,
} from "./helpers";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

const NOTICE_TONE_CLASSES = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
};

export default function EmailSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_EMAIL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  const smtpNotice = SMTP_SOURCE_NOTICES[settings.activeSmtpSource];

  const toastTimerRef = useRef(null);
  const smtpHostInputRef = useRef(null);
  const smtpPortInputRef = useRef(null);
  const smtpUsernameInputRef = useRef(null);
  const smtpPasswordInputRef = useRef(null);
  const senderNameInputRef = useRef(null);
  const senderEmailInputRef = useRef(null);
  const emailFooterTextInputRef = useRef(null);

  const fieldRefs = {
    smtpHost: smtpHostInputRef,
    smtpPort: smtpPortInputRef,
    smtpUsername: smtpUsernameInputRef,
    smtpPassword: smtpPasswordInputRef,
    senderName: senderNameInputRef,
    senderEmail: senderEmailInputRef,
    emailFooterText: emailFooterTextInputRef,
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
      const res = await fetch("/api/settings/email");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load email settings");
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
    if (saving) return;

    const result = validateEmailSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save email settings");
      setSettings(toFormSettings(json.data));
      showToast("Email settings saved");
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
        icon="mail"
        title="Email"
        onDiscard={handleDiscard}
        onSave={handleSave}
        saving={saving}
        disabled={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="SMTP Configuration">
            {!loading && smtpNotice && (
              <div
                role="status"
                className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-medium ${NOTICE_TONE_CLASSES[smtpNotice.tone]}`}
              >
                <Icon name={smtpNotice.icon} className="w-4 h-4 shrink-0 mt-px" />
                <span>{smtpNotice.message}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-smtp-host"
                label="SMTP Host"
                value={settings.smtpHost}
                onChange={(value) => setField("smtpHost", value)}
                placeholder="smtp.sendgrid.net"
                error={errors.smtpHost}
                inputRef={smtpHostInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
              <TextField
                id="f-smtp-port"
                label="SMTP Port"
                type="number"
                value={settings.smtpPort}
                onChange={(value) => setField("smtpPort", value)}
                placeholder="587"
                error={errors.smtpPort}
                hint="Usually 587 (TLS) or 465 (SSL)."
                inputRef={smtpPortInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-smtp-username"
                label="SMTP Username"
                value={settings.smtpUsername}
                onChange={(value) => setField("smtpUsername", value)}
                error={errors.smtpUsername}
                inputRef={smtpUsernameInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
              <TextField
                id="f-smtp-password"
                label="SMTP Password"
                type="password"
                value={settings.smtpPassword}
                onChange={(value) => setField("smtpPassword", value)}
                placeholder={settings.hasSmtpPassword ? "••••••••" : ""}
                error={errors.smtpPassword}
                hint={settings.hasSmtpPassword ? "A password is saved. Leave blank to keep it." : undefined}
                inputRef={smtpPasswordInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
            </div>
          </SectionCard>

          <SectionCard title="Sender & Templates">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-sender-name"
                label="Sender Name"
                value={settings.senderName}
                onChange={(value) => setField("senderName", value)}
                placeholder="Shop My Band"
                error={errors.senderName}
                inputRef={senderNameInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
              <TextField
                id="f-sender-email"
                label="Sender Email"
                type="email"
                value={settings.senderEmail}
                onChange={(value) => setField("senderEmail", value)}
                placeholder="orders@shopmyband.com"
                error={errors.senderEmail}
                inputRef={senderEmailInputRef}
                onEnter={handleSave}
                disabled={loading}
              />
            </div>
            <ToggleField
              label="Send order confirmation emails"
              description="Notify customers by email as soon as their order is placed."
              checked={settings.sendOrderConfirmationEmails}
              onChange={(value) => setField("sendOrderConfirmationEmails", value)}
              disabled={loading}
            />
            <ToggleField
              label="Send shipping notification emails"
              description="Notify customers by email when their order ships."
              checked={settings.sendShippingNotificationEmails}
              onChange={(value) => setField("sendShippingNotificationEmails", value)}
              disabled={loading}
            />
            <ToggleField
              label="Send marketing emails"
              description="Include customers in promotional and marketing email campaigns."
              checked={settings.sendMarketingEmails}
              onChange={(value) => setField("sendMarketingEmails", value)}
              disabled={loading}
            />
            <TextAreaField
              id="f-email-footer"
              label="Email Footer Text"
              rows={2}
              value={settings.emailFooterText}
              onChange={(value) => setField("emailFooterText", value)}
              placeholder="© Shop My Band. All rights reserved."
              error={errors.emailFooterText}
              hint={`Optional. Added to the bottom of every email. Up to ${MAX_EMAIL_FOOTER_LENGTH} characters.`}
              inputRef={emailFooterTextInputRef}
              disabled={loading}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="mail"
            title="About Email Settings"
            points={[
              "SMTP details saved here are used for every email the store sends — password resets, welcome emails and admin alerts — and take effect immediately.",
              "Until they are saved here, the SMTP_* values in .env.local are used as a fallback.",
              "Port 465 connects over SSL; any other port (usually 587) upgrades to TLS. For Gmail use smtp.gmail.com, port 587 and an App Password.",
              "The sender name and email appear as the \"From\" address customers see in their inbox. Gmail only allows your own address or a verified alias.",
              "The SMTP password is never shown again after saving — leave it blank to keep the current one.",
              "Turning off order confirmation emails is not recommended — customers rely on them for order tracking.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
