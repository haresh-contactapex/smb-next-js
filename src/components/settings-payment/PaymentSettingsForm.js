"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const DEFAULT_SETTINGS = {
  stripeEnabled: true,
  paypalEnabled: false,
  razorpayEnabled: false,
  codEnabled: true,
  publicKey: "",
  secretKey: "",
  transactionFee: "2.9",
  codMinOrder: "0",
  autoCapture: true,
};

export default function PaymentSettingsForm() {
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
    showToast("Payment settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="credit-card" title="Payment" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Payment Gateways">
            <ToggleField
              label="Stripe"
              checked={settings.stripeEnabled}
              onChange={(value) => setField("stripeEnabled", value)}
            />
            <ToggleField
              label="PayPal"
              checked={settings.paypalEnabled}
              onChange={(value) => setField("paypalEnabled", value)}
            />
            <ToggleField
              label="Razorpay"
              checked={settings.razorpayEnabled}
              onChange={(value) => setField("razorpayEnabled", value)}
            />
            <ToggleField
              label="Cash on Delivery (COD)"
              checked={settings.codEnabled}
              onChange={(value) => setField("codEnabled", value)}
            />
          </SectionCard>

          <SectionCard title="Gateway Configuration">
            <TextField
              id="f-public-key"
              label="Publishable / Public Key"
              value={settings.publicKey}
              onChange={(value) => setField("publicKey", value)}
            />
            <TextField
              id="f-secret-key"
              label="Secret Key"
              type="password"
              value={settings.secretKey}
              onChange={(value) => setField("secretKey", value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-transaction-fee"
                label="Transaction Fee (%)"
                type="number"
                value={settings.transactionFee}
                onChange={(value) => setField("transactionFee", value)}
                placeholder="2.9"
              />
              <TextField
                id="f-cod-min-order"
                label="Minimum Order for COD"
                type="number"
                value={settings.codMinOrder}
                onChange={(value) => setField("codMinOrder", value)}
                placeholder="0"
              />
            </div>
            <ToggleField
              label="Auto-capture payments"
              description="Capture funds immediately on order placement instead of only authorizing."
              checked={settings.autoCapture}
              onChange={(value) => setField("autoCapture", value)}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="credit-card"
            title="About Payment Gateways"
            points={[
              "The keys shown here are demo/placeholder values for this admin panel preview.",
              "Real API keys should never be committed to source control — use environment variables in production.",
              "Disabling a gateway hides it from customers at checkout immediately.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
