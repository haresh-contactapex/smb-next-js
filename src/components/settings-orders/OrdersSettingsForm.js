"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const DEFAULT_ORDER_STATUSES = ["Pending", "Processing", "Completed"];

const DEFAULT_SETTINGS = {
  orderNumberPrefix: "SMB-",
  startingOrderNumber: "10000",
  autoCancelHours: "24",
  defaultOrderStatus: "Pending",
  requireConfirmationEmail: true,
  allowOrderEdits: false,
};

export default function OrdersSettingsForm() {
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
    showToast("Orders settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="shopping-bag" title="Orders" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Order Numbering">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-order-number-prefix"
                label="Order Number Prefix"
                value={settings.orderNumberPrefix}
                onChange={(value) => setField("orderNumberPrefix", value)}
                placeholder="SMB-"
              />
              <TextField
                id="f-starting-order-number"
                label="Starting Order Number"
                type="number"
                value={settings.startingOrderNumber}
                onChange={(value) => setField("startingOrderNumber", value)}
                placeholder="10000"
              />
            </div>
          </SectionCard>

          <SectionCard title="Order Rules">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-auto-cancel-hours"
                label="Auto-cancel Unpaid Orders After (hours)"
                type="number"
                value={settings.autoCancelHours}
                onChange={(value) => setField("autoCancelHours", value)}
                placeholder="24"
              />
              <SelectField
                id="f-default-order-status"
                label="Default Order Status"
                value={settings.defaultOrderStatus}
                options={DEFAULT_ORDER_STATUSES}
                onChange={(value) => setField("defaultOrderStatus", value)}
              />
            </div>
            <ToggleField
              label="Require order confirmation email before fulfillment"
              checked={settings.requireConfirmationEmail}
              onChange={(value) => setField("requireConfirmationEmail", value)}
            />
            <ToggleField
              label="Allow order edits after placement"
              checked={settings.allowOrderEdits}
              onChange={(value) => setField("allowOrderEdits", value)}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="shopping-bag"
            title="About Order Settings"
            points={[
              "The order number prefix and starting number apply to all newly placed orders.",
              "Unpaid orders past the auto-cancel window are automatically moved to a cancelled state.",
              "Allowing order edits lets staff adjust an order after it has already been placed.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
