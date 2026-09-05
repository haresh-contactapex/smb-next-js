"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const BUSINESS_TYPES = ["Sole Proprietorship", "LLC", "Corporation", "Partnership", "Other"];

const DEFAULT_SETTINGS = {
  legalBusinessName: "Shop My Band LLC",
  businessType: "LLC",
  storeUrl: "https://shopmyband.com",
  taxId: "",
  supportEmail: "support@shopmyband.com",
  supportPhone: "",
  supportHours: "Mon–Fri, 9am–6pm EST",
  storeIsLive: true,
};

export default function StoreSettingsForm() {
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
    showToast("Store settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="package" title="Store" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Store Details">
            <TextField
              id="f-legal-business-name"
              label="Legal Business Name"
              value={settings.legalBusinessName}
              onChange={(value) => setField("legalBusinessName", value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="f-business-type"
                label="Business Type"
                value={settings.businessType}
                options={BUSINESS_TYPES}
                onChange={(value) => setField("businessType", value)}
              />
              <TextField
                id="f-store-url"
                label="Store URL"
                value={settings.storeUrl}
                onChange={(value) => setField("storeUrl", value)}
                placeholder="https://shopmyband.com"
              />
            </div>
            <TextField
              id="f-tax-id"
              label="Business Registration / Tax ID"
              value={settings.taxId}
              onChange={(value) => setField("taxId", value)}
            />
          </SectionCard>

          <SectionCard title="Support">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-support-email"
                label="Support Email"
                type="email"
                value={settings.supportEmail}
                onChange={(value) => setField("supportEmail", value)}
              />
              <TextField
                id="f-support-phone"
                label="Support Phone"
                type="tel"
                value={settings.supportPhone}
                onChange={(value) => setField("supportPhone", value)}
              />
            </div>
            <TextField
              id="f-support-hours"
              label="Support Hours"
              value={settings.supportHours}
              onChange={(value) => setField("supportHours", value)}
              placeholder="Mon–Fri, 9am–6pm EST"
            />
            <ToggleField
              label="Store is live"
              description="When off, the storefront shows a coming-soon page instead of products."
              checked={settings.storeIsLive}
              onChange={(value) => setField("storeIsLive", value)}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="package"
            title="About Store Settings"
            points={[
              "Your legal business name and tax ID appear on customer invoices and receipts.",
              "Support contact details are shown in the storefront footer and order confirmation emails.",
              "Taking the store offline shows customers a coming-soon page instead of blocking checkout errors.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
