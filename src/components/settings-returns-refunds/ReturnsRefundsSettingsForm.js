"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const REFUND_METHODS = ["Original payment method", "Store credit", "Either"];
const RETURN_SHIPPING_PAID_BY = ["Customer", "Store"];

const DEFAULT_SETTINGS = {
  returnWindowDays: "30",
  restockingFeePercent: "0",
  allowExchanges: true,
  refundMethod: "Original payment method",
  returnShippingPaidBy: "Customer",
  autoApproveReturns: false,
};

export default function ReturnsRefundsSettingsForm() {
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
    showToast("Returns & Refunds settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="refresh-cw" title="Returns & Refunds" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Return Policy">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-return-window"
                label="Return Window (days)"
                type="number"
                value={settings.returnWindowDays}
                onChange={(value) => setField("returnWindowDays", value)}
                placeholder="30"
              />
              <TextField
                id="f-restocking-fee"
                label="Restocking Fee (%)"
                type="number"
                value={settings.restockingFeePercent}
                onChange={(value) => setField("restockingFeePercent", value)}
                placeholder="0"
              />
            </div>
            <ToggleField
              label="Allow exchanges instead of refunds"
              checked={settings.allowExchanges}
              onChange={(value) => setField("allowExchanges", value)}
            />
          </SectionCard>

          <SectionCard title="Refund Rules">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="f-refund-method"
                label="Refund Method"
                value={settings.refundMethod}
                options={REFUND_METHODS}
                onChange={(value) => setField("refundMethod", value)}
              />
              <SelectField
                id="f-return-shipping-paid-by"
                label="Return Shipping Paid By"
                value={settings.returnShippingPaidBy}
                options={RETURN_SHIPPING_PAID_BY}
                onChange={(value) => setField("returnShippingPaidBy", value)}
              />
            </div>
            <ToggleField
              label="Auto-approve return requests"
              checked={settings.autoApproveReturns}
              onChange={(value) => setField("autoApproveReturns", value)}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="refresh-cw"
            title="About Returns & Refunds"
            points={[
              "The return window determines how many days after delivery a customer can request a return.",
              "Restocking fees are deducted from the refunded amount for returned items.",
              "Auto-approving returns speeds up processing but skips manual review.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
