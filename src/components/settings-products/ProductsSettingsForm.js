"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const PRODUCT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

const WEIGHT_UNITS = [
  { value: "lb", label: "lb" },
  { value: "kg", label: "kg" },
];

const DEFAULT_SETTINGS = {
  skuPrefix: "",
  defaultStatus: "draft",
  defaultWeightUnit: "lb",
  allowBackorders: false,
  allowReviews: true,
  showLowStockBadge: true,
  lowStockThreshold: "5",
};

export default function ProductsSettingsForm() {
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
    showToast("Products settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="layers" title="Products" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Product Defaults">
            <TextField
              id="f-sku-prefix"
              label="SKU Prefix"
              value={settings.skuPrefix}
              onChange={(value) => setField("skuPrefix", value)}
              placeholder="SMB-"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="f-default-status"
                label="Default Product Status"
                value={settings.defaultStatus}
                options={PRODUCT_STATUSES}
                onChange={(value) => setField("defaultStatus", value)}
              />
              <SelectField
                id="f-weight-unit"
                label="Default Weight Unit"
                value={settings.defaultWeightUnit}
                options={WEIGHT_UNITS}
                onChange={(value) => setField("defaultWeightUnit", value)}
              />
            </div>
          </SectionCard>

          <SectionCard title="Catalog Behavior">
            <ToggleField
              label="Allow backorders"
              checked={settings.allowBackorders}
              onChange={(value) => setField("allowBackorders", value)}
            />
            <ToggleField
              label="Allow customer reviews"
              checked={settings.allowReviews}
              onChange={(value) => setField("allowReviews", value)}
            />
            <ToggleField
              label="Show low-stock badge on product page"
              checked={settings.showLowStockBadge}
              onChange={(value) => setField("showLowStockBadge", value)}
            />
            <TextField
              id="f-low-stock-threshold"
              label="Low Stock Threshold"
              type="number"
              value={settings.lowStockThreshold}
              onChange={(value) => setField("lowStockThreshold", value)}
              placeholder="5"
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="layers"
            title="About Product Settings"
            points={[
              "SKU prefixes help you keep product codes consistent across your catalog.",
              "New products default to the status and weight unit set here unless changed manually.",
              "Low-stock badges alert customers before an item sells out completely.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
