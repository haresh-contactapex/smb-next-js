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
  smtpHost: "",
  smtpPort: "",
  smtpUsername: "",
  smtpPassword: "",
  senderName: "",
  senderEmail: "",
  sendOrderConfirmationEmails: true,
  sendShippingNotificationEmails: true,
  sendMarketingEmails: false,
  emailFooterText: "",
};

export default function EmailSettingsForm() {
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
    showToast("Email settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="mail" title="Email" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="SMTP Configuration">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-smtp-host"
                label="SMTP Host"
                value={settings.smtpHost}
                onChange={(value) => setField("smtpHost", value)}
                placeholder="smtp.sendgrid.net"
              />
              <TextField
                id="f-smtp-port"
                label="SMTP Port"
                type="number"
                value={settings.smtpPort}
                onChange={(value) => setField("smtpPort", value)}
                placeholder="587"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-smtp-username"
                label="SMTP Username"
                value={settings.smtpUsername}
                onChange={(value) => setField("smtpUsername", value)}
              />
              <TextField
                id="f-smtp-password"
                label="SMTP Password"
                type="password"
                value={settings.smtpPassword}
                onChange={(value) => setField("smtpPassword", value)}
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
              />
              <TextField
                id="f-sender-email"
                label="Sender Email"
                type="email"
                value={settings.senderEmail}
                onChange={(value) => setField("senderEmail", value)}
                placeholder="orders@shopmyband.com"
              />
            </div>
            <ToggleField
              label="Send order confirmation emails"
              description="Notify customers by email as soon as their order is placed."
              checked={settings.sendOrderConfirmationEmails}
              onChange={(value) => setField("sendOrderConfirmationEmails", value)}
            />
            <ToggleField
              label="Send shipping notification emails"
              description="Notify customers by email when their order ships."
              checked={settings.sendShippingNotificationEmails}
              onChange={(value) => setField("sendShippingNotificationEmails", value)}
            />
            <ToggleField
              label="Send marketing emails"
              description="Include customers in promotional and marketing email campaigns."
              checked={settings.sendMarketingEmails}
              onChange={(value) => setField("sendMarketingEmails", value)}
            />
            <TextAreaField
              id="f-email-footer"
              label="Email Footer Text"
              rows={2}
              value={settings.emailFooterText}
              onChange={(value) => setField("emailFooterText", value)}
              placeholder="© Shop My Band. All rights reserved."
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="mail"
            title="About Email Settings"
            points={[
              "SMTP credentials are used to send all transactional and marketing emails from the store.",
              "The sender name and email appear as the \"From\" address customers see in their inbox.",
              "Turning off order confirmation emails is not recommended — customers rely on them for order tracking.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
