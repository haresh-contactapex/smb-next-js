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
  defaultMetaTitle: "",
  defaultMetaDescription: "",
  googleAnalyticsId: "",
  facebookPixelId: "",
  generateXmlSitemap: true,
  robotsTxtContent: "",
};

export default function SeoSettingsForm() {
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
    showToast("SEO settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="search" title="SEO" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Meta Defaults">
            <TextField
              id="f-default-meta-title"
              label="Default Meta Title"
              value={settings.defaultMetaTitle}
              onChange={(value) => setField("defaultMetaTitle", value)}
              placeholder="Shop My Band — Handcrafted Rings & Bands"
            />
            <TextAreaField
              id="f-default-meta-description"
              label="Default Meta Description"
              rows={3}
              value={settings.defaultMetaDescription}
              onChange={(value) => setField("defaultMetaDescription", value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-google-analytics-id"
                label="Google Analytics ID"
                value={settings.googleAnalyticsId}
                onChange={(value) => setField("googleAnalyticsId", value)}
                placeholder="G-XXXXXXXXXX"
              />
              <TextField
                id="f-facebook-pixel-id"
                label="Facebook Pixel ID"
                value={settings.facebookPixelId}
                onChange={(value) => setField("facebookPixelId", value)}
              />
            </div>
          </SectionCard>

          <SectionCard title="Crawling">
            <ToggleField
              label="Generate XML sitemap"
              description="Automatically generate and publish a sitemap.xml for search engines."
              checked={settings.generateXmlSitemap}
              onChange={(value) => setField("generateXmlSitemap", value)}
            />
            <TextAreaField
              id="f-robots-txt"
              label="robots.txt Content"
              rows={4}
              value={settings.robotsTxtContent}
              onChange={(value) => setField("robotsTxtContent", value)}
              placeholder={"User-agent: *\nAllow: /"}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="search"
            title="About SEO Settings"
            points={[
              "Default meta title and description are used for pages that don't set their own.",
              "Analytics and pixel IDs let external tools track storefront traffic and conversions.",
              "Changes to robots.txt can affect how search engines crawl and index the store — edit with care.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
