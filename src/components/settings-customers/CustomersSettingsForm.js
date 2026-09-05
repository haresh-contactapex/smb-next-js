"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const CUSTOMER_GROUPS = ["Retail", "Wholesale", "VIP"];

const DEFAULT_SETTINGS = {
  allowGuestCheckout: true,
  requireEmailVerification: true,
  allowSelfDeleteAccount: false,
  defaultCustomerGroup: "Retail",
  enableLoyaltyPoints: false,
  defaultMarketingConsent: false,
};

export default function CustomersSettingsForm() {
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
    showToast("Customers settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="users" title="Customers" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Account Rules">
            <ToggleField
              label="Allow guest checkout"
              checked={settings.allowGuestCheckout}
              onChange={(value) => setField("allowGuestCheckout", value)}
            />
            <ToggleField
              label="Require email verification on signup"
              checked={settings.requireEmailVerification}
              onChange={(value) => setField("requireEmailVerification", value)}
            />
            <ToggleField
              label="Allow customers to delete their own account"
              checked={settings.allowSelfDeleteAccount}
              onChange={(value) => setField("allowSelfDeleteAccount", value)}
            />
          </SectionCard>

          <SectionCard title="Defaults">
            <SelectField
              id="f-default-customer-group"
              label="Default Customer Group"
              value={settings.defaultCustomerGroup}
              options={CUSTOMER_GROUPS}
              onChange={(value) => setField("defaultCustomerGroup", value)}
            />
            <ToggleField
              label="Enable loyalty points"
              checked={settings.enableLoyaltyPoints}
              onChange={(value) => setField("enableLoyaltyPoints", value)}
            />
            <ToggleField
              label="Default marketing email consent"
              checked={settings.defaultMarketingConsent}
              onChange={(value) => setField("defaultMarketingConsent", value)}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="users"
            title="About Customer Settings"
            points={[
              "New customers are placed in the default customer group unless assigned otherwise.",
              "Requiring email verification helps reduce fake accounts and abandoned signups.",
              "Marketing consent defaults only apply to new signups and can be changed per customer.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
