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
  termsUrl: "",
  privacyUrl: "",
  refundUrl: "",
  shippingPolicyUrl: "",
  showCookieBanner: true,
  legalAddress: "",
};

export default function LegalSettingsForm() {
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
    showToast("Legal settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="file-text" title="Legal" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Policies">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-terms-url"
                label="Terms of Service URL"
                type="url"
                value={settings.termsUrl}
                onChange={(value) => setField("termsUrl", value)}
                placeholder="https://yourstore.com/terms"
              />
              <TextField
                id="f-privacy-url"
                label="Privacy Policy URL"
                type="url"
                value={settings.privacyUrl}
                onChange={(value) => setField("privacyUrl", value)}
                placeholder="https://yourstore.com/privacy"
              />
              <TextField
                id="f-refund-url"
                label="Refund Policy URL"
                type="url"
                value={settings.refundUrl}
                onChange={(value) => setField("refundUrl", value)}
                placeholder="https://yourstore.com/refunds"
              />
              <TextField
                id="f-shipping-policy-url"
                label="Shipping Policy URL"
                type="url"
                value={settings.shippingPolicyUrl}
                onChange={(value) => setField("shippingPolicyUrl", value)}
                placeholder="https://yourstore.com/shipping-policy"
              />
            </div>
          </SectionCard>

          <SectionCard title="Compliance">
            <ToggleField
              label="Show cookie consent banner"
              checked={settings.showCookieBanner}
              onChange={(value) => setField("showCookieBanner", value)}
            />
            <TextAreaField
              id="f-legal-address"
              label="Business Legal Address"
              rows={2}
              value={settings.legalAddress}
              onChange={(value) => setField("legalAddress", value)}
              placeholder="123 Main St, Suite 100, Nashville, TN 37203"
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="file-text"
            title="About Legal Settings"
            points={[
              "Policy URLs are linked from the storefront footer and checkout pages.",
              "The cookie consent banner helps meet regional privacy regulations like GDPR and CCPA.",
              "Your business legal address may be required for tax and compliance documents.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
