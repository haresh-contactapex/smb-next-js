"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const CARRIERS = ["USPS", "UPS", "FedEx", "DHL", "Local Courier"];
const WEIGHT_UNITS = ["lb", "kg"];
const DIMENSION_UNITS = ["in", "cm"];

const DEFAULT_SETTINGS = {
  defaultCarrier: "USPS",
  flatRateFee: "5.99",
  freeShippingThreshold: "75",
  processingTimeDays: "2",
  weightUnit: "lb",
  dimensionUnit: "in",
  localPickupEnabled: false,
};

export default function ShippingSettingsForm() {
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
    showToast("Shipping settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="truck" title="Shipping" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Shipping Rates">
            <SelectField
              id="f-default-carrier"
              label="Default Carrier"
              value={settings.defaultCarrier}
              options={CARRIERS}
              onChange={(value) => setField("defaultCarrier", value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-flat-rate-fee"
                label="Flat Rate Shipping Fee"
                type="number"
                value={settings.flatRateFee}
                onChange={(value) => setField("flatRateFee", value)}
                placeholder="5.99"
              />
              <TextField
                id="f-free-shipping-threshold"
                label="Free Shipping Threshold"
                type="number"
                value={settings.freeShippingThreshold}
                onChange={(value) => setField("freeShippingThreshold", value)}
                placeholder="75"
              />
            </div>
          </SectionCard>

          <SectionCard title="Fulfillment">
            <TextField
              id="f-processing-time"
              label="Order Processing Time (days)"
              type="number"
              value={settings.processingTimeDays}
              onChange={(value) => setField("processingTimeDays", value)}
              placeholder="2"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="f-weight-unit"
                label="Weight Unit"
                value={settings.weightUnit}
                options={WEIGHT_UNITS}
                onChange={(value) => setField("weightUnit", value)}
              />
              <SelectField
                id="f-dimension-unit"
                label="Dimension Unit"
                value={settings.dimensionUnit}
                options={DIMENSION_UNITS}
                onChange={(value) => setField("dimensionUnit", value)}
              />
            </div>
            <ToggleField
              label="Enable local pickup"
              checked={settings.localPickupEnabled}
              onChange={(value) => setField("localPickupEnabled", value)}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="truck"
            title="About Shipping"
            points={[
              "The flat rate fee applies to orders under the free shipping threshold.",
              "Processing time is shown to customers at checkout as an estimated dispatch window.",
              "Weight and dimension units are used across product data and carrier rate calculations.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
