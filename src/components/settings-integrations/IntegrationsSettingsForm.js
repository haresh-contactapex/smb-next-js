"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const DEFAULT_SETTINGS = {
  googleAnalyticsEnabled: true,
  googleAnalyticsId: "",
  metaPixelEnabled: false,
  metaPixelId: "",
  mailchimpEnabled: false,
  mailchimpApiKey: "",
  slackEnabled: false,
  slackWebhookUrl: "",
  zapierEnabled: false,
  zapierApiKey: "",
};

export default function IntegrationsSettingsForm() {
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
    showToast("Integrations settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="link" title="Integrations" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Analytics & Marketing">
            <ToggleField
              label="Google Analytics"
              checked={settings.googleAnalyticsEnabled}
              onChange={(value) => setField("googleAnalyticsEnabled", value)}
            />
            <TextField
              id="f-ga-id"
              label="Measurement ID"
              value={settings.googleAnalyticsId}
              onChange={(value) => setField("googleAnalyticsId", value)}
              placeholder="G-XXXXXXXXXX"
            />

            <ToggleField
              label="Meta / Facebook Pixel"
              checked={settings.metaPixelEnabled}
              onChange={(value) => setField("metaPixelEnabled", value)}
            />
            <TextField
              id="f-meta-pixel-id"
              label="Pixel ID"
              value={settings.metaPixelId}
              onChange={(value) => setField("metaPixelId", value)}
              placeholder="123456789012345"
            />

            <ToggleField
              label="Mailchimp"
              checked={settings.mailchimpEnabled}
              onChange={(value) => setField("mailchimpEnabled", value)}
            />
            <TextField
              id="f-mailchimp-key"
              label="API Key"
              value={settings.mailchimpApiKey}
              onChange={(value) => setField("mailchimpApiKey", value)}
              placeholder="Enter API key"
            />
          </SectionCard>

          <SectionCard title="Productivity">
            <ToggleField
              label="Slack notifications"
              checked={settings.slackEnabled}
              onChange={(value) => setField("slackEnabled", value)}
            />
            <TextField
              id="f-slack-webhook"
              label="Webhook URL"
              type="url"
              value={settings.slackWebhookUrl}
              onChange={(value) => setField("slackWebhookUrl", value)}
              placeholder="https://hooks.slack.com/services/..."
            />

            <ToggleField
              label="Zapier"
              checked={settings.zapierEnabled}
              onChange={(value) => setField("zapierEnabled", value)}
            />
            <TextField
              id="f-zapier-key"
              label="API Key"
              value={settings.zapierApiKey}
              onChange={(value) => setField("zapierApiKey", value)}
              placeholder="Enter API key"
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="link"
            title="About Integrations"
            points={[
              "Connect third-party analytics and marketing tools to track storefront activity.",
              "API keys and webhook URLs are only used by the integrations you enable above.",
              "Disabling an integration stops new data from being sent, but does not delete existing data.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
