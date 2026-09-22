"use client";

import { useEffect, useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "./Toast";
import {
  DEFAULT_NOTIFICATIONS_SETTINGS,
  toFormSettings,
  toSavePayload,
  validateNotificationsSettingsForm,
} from "./helpers";

const DEFAULT_TOAST_DURATION_MS = 2200;

export default function NotificationsSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATIONS_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const notificationRecipientEmailInputRef = useRef(null);
  const toastTimeoutSecondsInputRef = useRef(null);

  const fieldRefs = {
    notificationRecipientEmail: notificationRecipientEmailInputRef,
    toastTimeoutSeconds: toastTimeoutSecondsInputRef,
  };

  function focusField(field) {
    fieldRefs[field]?.current?.focus();
  }

  function toastDurationMs() {
    const seconds = Number(settings.toastTimeoutSeconds);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_TOAST_DURATION_MS;
  }

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), toastDurationMs());
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/notifications");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load notification settings");
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
    const result = validateNotificationsSettingsForm(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      focusField(result.firstErrorField);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save notification settings");
      setSettings(toFormSettings(json.data));
      showToast("Notifications settings saved");
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
        icon="bell"
        title="Notifications"
        onDiscard={handleDiscard}
        onSave={handleSave}
        saving={saving}
        disabled={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Admin Alerts">
            <ToggleField
              label="New order email alert"
              description="Email admins whenever a new order is placed."
              checked={settings.newOrderEmailAlert}
              onChange={(value) => setField("newOrderEmailAlert", value)}
              disabled={loading}
            />
            <ToggleField
              label="Low stock alert"
              description="Email admins when a product's inventory falls below its threshold."
              checked={settings.lowStockAlert}
              onChange={(value) => setField("lowStockAlert", value)}
              disabled={loading}
            />
            <ToggleField
              label="New customer signup alert"
              description="Email admins whenever a new customer creates an account."
              checked={settings.newCustomerSignupAlert}
              onChange={(value) => setField("newCustomerSignupAlert", value)}
              disabled={loading}
            />
            <TextField
              id="f-notification-recipient-email"
              label="Notification Recipient Email"
              type="email"
              value={settings.notificationRecipientEmail}
              onChange={(value) => setField("notificationRecipientEmail", value)}
              placeholder="admin@shopmyband.com"
              error={errors.notificationRecipientEmail}
              inputRef={notificationRecipientEmailInputRef}
              onEnter={handleSave}
              disabled={loading}
            />
          </SectionCard>

          <SectionCard title="Channels">
            <ToggleField
              label="Enable SMS notifications"
              description="Send admin alerts as text messages in addition to email."
              checked={settings.enableSmsNotifications}
              onChange={(value) => setField("enableSmsNotifications", value)}
              disabled={loading}
            />
            <ToggleField
              label="Enable push notifications"
              description="Send admin alerts as browser or mobile push notifications."
              checked={settings.enablePushNotifications}
              onChange={(value) => setField("enablePushNotifications", value)}
              disabled={loading}
            />
          </SectionCard>

          <SectionCard title="Toast Notifications">
            <TextField
              id="f-toast-timeout-seconds"
              label="Toast Notification Timeout (seconds)"
              type="number"
              value={settings.toastTimeoutSeconds}
              onChange={(value) => setField("toastTimeoutSeconds", value)}
              placeholder="3"
              hint="How long the on-screen save confirmation and error toasts stay visible. 1-30 seconds."
              error={errors.toastTimeoutSeconds}
              inputRef={toastTimeoutSecondsInputRef}
              onEnter={handleSave}
              disabled={loading}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="bell"
            title="About Notifications"
            points={[
              "These alerts are separate from the notification bell in the admin header — they control which events trigger outbound alerts.",
              "The recipient email receives all enabled admin alerts unless a channel below overrides it.",
              "SMS and push notifications require the corresponding channel to be configured before they can be delivered.",
              "The toast timeout controls how long this page's own save/error confirmations stay on screen.",
            ]}
          />
        </div>
      </div>

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        durationMs={toastDurationMs()}
        onDismiss={dismissToast}
      />
    </>
  );
}
