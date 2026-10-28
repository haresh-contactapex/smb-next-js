"use client";

import { useEffect, useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";
import {
  DEFAULT_SOCIAL_MEDIA_SETTINGS,
  SOCIAL_PLATFORMS,
  toFormSettings,
  toSavePayload,
  validateSocialMediaSettingsForm,
} from "./helpers";

const PLACEHOLDERS = {
  facebookUrl: "https://facebook.com/yourpage",
  instagramUrl: "https://instagram.com/yourpage",
  twitterUrl: "https://x.com/yourpage",
  pinterestUrl: "https://pinterest.com/yourpage",
  tiktokUrl: "https://tiktok.com/@yourpage",
  youtubeUrl: "https://youtube.com/@yourchannel",
};

// The field labels differ from the storefront's short names ("X" is "Twitter / X" here).
const FIELD_LABELS = { twitterUrl: "Twitter / X URL" };

export default function SocialMediaSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_SOCIAL_MEDIA_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  const toastTimerRef = useRef(null);
  const inputRefs = useRef({});

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/social-media");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load Social Media settings");
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
    return () => clearTimeout(toastTimerRef.current);
  }, []);

  function setField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSave() {
    const result = validateSocialMediaSettingsForm(settings);
    setErrors(result.errors);
    if (!result.valid) {
      showToast(result.message, "error");
      inputRefs.current[result.firstErrorField]?.focus();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/social-media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSavePayload(settings)),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save Social Media settings");
      setSettings(toFormSettings(json.data));
      showToast("Social Media settings saved");
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
      <PageToolbar icon="share-2" title="Social Media" onDiscard={handleDiscard} onSave={handleSave} saving={saving} disabled={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Social Links">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SOCIAL_PLATFORMS.map(({ field, label }) => (
                <TextField
                  key={field}
                  id={`f-${field}`}
                  label={FIELD_LABELS[field] || `${label} URL`}
                  type="url"
                  value={settings[field]}
                  onChange={(value) => setField(field, value)}
                  placeholder={PLACEHOLDERS[field]}
                  error={errors[field]}
                  inputRef={(node) => {
                    inputRefs.current[field] = node;
                  }}
                  disabled={loading}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Sharing">
            <ToggleField
              label="Show social share buttons on product pages"
              checked={settings.showShareButtons}
              onChange={(value) => setField("showShareButtons", value)}
              disabled={loading}
            />
            <ToggleField
              label="Show social links in storefront footer"
              checked={settings.showFooterLinks}
              onChange={(value) => setField("showFooterLinks", value)}
              disabled={loading}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="share-2"
            title="About Social Media"
            points={[
              "Links added here appear as icons in the storefront footer.",
              "Leave a field blank to hide that platform's icon from the storefront.",
              "Turn off \"Show social links in storefront footer\" to hide all of the icons.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
