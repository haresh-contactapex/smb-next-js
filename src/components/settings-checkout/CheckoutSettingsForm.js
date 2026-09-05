"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const DEFAULT_SETTINGS = {
  allowGuestCheckout: true,
  requirePhone: false,
  requireTerms: true,
  minimumOrderAmount: "0",
  sendAbandonedCartEmails: true,
  reminderDelayHours: "4",
};

export default function CheckoutSettingsForm() {
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
    showToast("Checkout settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="check-circle" title="Checkout" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Checkout Options">
            <ToggleField
              label="Allow guest checkout"
              checked={settings.allowGuestCheckout}
              onChange={(value) => setField("allowGuestCheckout", value)}
            />
            <ToggleField
              label="Require phone number at checkout"
              checked={settings.requirePhone}
              onChange={(value) => setField("requirePhone", value)}
            />
            <ToggleField
              label="Require terms & conditions acceptance"
              checked={settings.requireTerms}
              onChange={(value) => setField("requireTerms", value)}
            />
            <TextField
              id="f-min-order-amount"
              label="Minimum Order Amount"
              type="number"
              value={settings.minimumOrderAmount}
              onChange={(value) => setField("minimumOrderAmount", value)}
              placeholder="0"
            />
          </SectionCard>

          <SectionCard title="Abandoned Carts">
            <ToggleField
              label="Send abandoned cart reminder emails"
              checked={settings.sendAbandonedCartEmails}
              onChange={(value) => setField("sendAbandonedCartEmails", value)}
            />
            <TextField
              id="f-reminder-delay"
              label="Reminder Delay (hours)"
              type="number"
              value={settings.reminderDelayHours}
              onChange={(value) => setField("reminderDelayHours", value)}
              placeholder="4"
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="check-circle"
            title="About Checkout Settings"
            points={[
              "Guest checkout lets customers buy without creating an account.",
              "Abandoned cart emails are sent after the configured delay to recover lost sales.",
              "Requiring terms acceptance helps protect your store from disputes.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
