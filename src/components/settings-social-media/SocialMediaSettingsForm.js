"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const DEFAULT_SETTINGS = {
  facebookUrl: "",
  instagramUrl: "",
  twitterUrl: "",
  pinterestUrl: "",
  tiktokUrl: "",
  youtubeUrl: "",
  showShareButtons: true,
  showFooterLinks: true,
};

export default function SocialMediaSettingsForm() {
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
    showToast("Social Media settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="share-2" title="Social Media" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Social Links">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-facebook-url"
                label="Facebook URL"
                type="url"
                value={settings.facebookUrl}
                onChange={(value) => setField("facebookUrl", value)}
                placeholder="https://facebook.com/yourpage"
              />
              <TextField
                id="f-instagram-url"
                label="Instagram URL"
                type="url"
                value={settings.instagramUrl}
                onChange={(value) => setField("instagramUrl", value)}
                placeholder="https://instagram.com/yourpage"
              />
              <TextField
                id="f-twitter-url"
                label="Twitter / X URL"
                type="url"
                value={settings.twitterUrl}
                onChange={(value) => setField("twitterUrl", value)}
                placeholder="https://x.com/yourpage"
              />
              <TextField
                id="f-pinterest-url"
                label="Pinterest URL"
                type="url"
                value={settings.pinterestUrl}
                onChange={(value) => setField("pinterestUrl", value)}
                placeholder="https://pinterest.com/yourpage"
              />
              <TextField
                id="f-tiktok-url"
                label="TikTok URL"
                type="url"
                value={settings.tiktokUrl}
                onChange={(value) => setField("tiktokUrl", value)}
                placeholder="https://tiktok.com/@yourpage"
              />
              <TextField
                id="f-youtube-url"
                label="YouTube URL"
                type="url"
                value={settings.youtubeUrl}
                onChange={(value) => setField("youtubeUrl", value)}
                placeholder="https://youtube.com/@yourchannel"
              />
            </div>
          </SectionCard>

          <SectionCard title="Sharing">
            <ToggleField
              label="Show social share buttons on product pages"
              checked={settings.showShareButtons}
              onChange={(value) => setField("showShareButtons", value)}
            />
            <ToggleField
              label="Show social links in storefront footer"
              checked={settings.showFooterLinks}
              onChange={(value) => setField("showFooterLinks", value)}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="share-2"
            title="About Social Media"
            points={[
              "Links added here appear as icons in the storefront footer and on product share menus.",
              "Leave a field blank to hide that platform's icon from the storefront.",
              "Share buttons let customers post products directly to their own social accounts.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
