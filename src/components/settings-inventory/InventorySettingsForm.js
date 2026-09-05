"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const OUT_OF_STOCK_BEHAVIORS = ["Hide product", "Show as sold out", "Allow backorder"];

const DEFAULT_SETTINGS = {
  trackInventory: true,
  lowStockThreshold: "5",
  outOfStockBehavior: "Hide product",
  multipleWarehouses: false,
  emailOnLowStock: true,
  restockAlertEmail: "",
};

export default function InventorySettingsForm() {
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
    showToast("Inventory settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="list" title="Inventory" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Stock Tracking">
            <ToggleField
              label="Track inventory quantities"
              checked={settings.trackInventory}
              onChange={(value) => setField("trackInventory", value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-low-stock-threshold"
                label="Low Stock Threshold"
                type="number"
                value={settings.lowStockThreshold}
                onChange={(value) => setField("lowStockThreshold", value)}
                placeholder="5"
              />
              <SelectField
                id="f-oos-behavior"
                label="Out-of-stock Behavior"
                value={settings.outOfStockBehavior}
                options={OUT_OF_STOCK_BEHAVIORS}
                onChange={(value) => setField("outOfStockBehavior", value)}
              />
            </div>
          </SectionCard>

          <SectionCard title="Warehouses & Alerts">
            <ToggleField
              label="Enable multiple warehouses/locations"
              checked={settings.multipleWarehouses}
              onChange={(value) => setField("multipleWarehouses", value)}
            />
            <ToggleField
              label="Email me when stock runs low"
              checked={settings.emailOnLowStock}
              onChange={(value) => setField("emailOnLowStock", value)}
            />
            <TextField
              id="f-restock-email"
              label="Restock Alert Recipient Email"
              type="email"
              value={settings.restockAlertEmail}
              onChange={(value) => setField("restockAlertEmail", value)}
              placeholder="inventory@shopmyband.com"
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="list"
            title="About Inventory Settings"
            points={[
              "Turning off quantity tracking removes stock counts from product pages entirely.",
              "Low stock alerts help you reorder before an item goes out of stock.",
              "Multiple warehouses let you track stock separately across locations.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
