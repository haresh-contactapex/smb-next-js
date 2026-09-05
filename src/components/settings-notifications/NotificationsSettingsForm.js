"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const DEFAULT_SETTINGS = {
  newOrderEmailAlert: true,
  lowStockAlert: true,
  newCustomerSignupAlert: false,
  notificationRecipientEmail: "",
  enableSmsNotifications: false,
  enablePushNotifications: false,
};

export default function NotificationsSettingsForm() {
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
    showToast("Notifications settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="bell" title="Notifications" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Admin Alerts">
            <ToggleField
              label="New order email alert"
              description="Email admins whenever a new order is placed."
              checked={settings.newOrderEmailAlert}
              onChange={(value) => setField("newOrderEmailAlert", value)}
            />
            <ToggleField
              label="Low stock alert"
              description="Email admins when a product's inventory falls below its threshold."
              checked={settings.lowStockAlert}
              onChange={(value) => setField("lowStockAlert", value)}
            />
            <ToggleField
              label="New customer signup alert"
              description="Email admins whenever a new customer creates an account."
              checked={settings.newCustomerSignupAlert}
              onChange={(value) => setField("newCustomerSignupAlert", value)}
            />
            <TextField
              id="f-notification-recipient-email"
              label="Notification Recipient Email"
              type="email"
              value={settings.notificationRecipientEmail}
              onChange={(value) => setField("notificationRecipientEmail", value)}
              placeholder="admin@shopmyband.com"
            />
          </SectionCard>

          <SectionCard title="Channels">
            <ToggleField
              label="Enable SMS notifications"
              description="Send admin alerts as text messages in addition to email."
              checked={settings.enableSmsNotifications}
              onChange={(value) => setField("enableSmsNotifications", value)}
            />
            <ToggleField
              label="Enable push notifications"
              description="Send admin alerts as browser or mobile push notifications."
              checked={settings.enablePushNotifications}
              onChange={(value) => setField("enablePushNotifications", value)}
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
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
