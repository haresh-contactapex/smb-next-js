"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const DEFAULT_SETTINGS = {
  allowMultipleCoupons: false,
  maxDiscountPercent: "50",
  caseSensitiveCoupons: false,
  autoApplyBestDiscount: true,
  minOrderAmountForCoupon: "0",
};

export default function DiscountsCouponsSettingsForm() {
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
    showToast("Discounts & Coupons settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="tag" title="Discounts & Coupons" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Coupon Rules">
            <ToggleField
              label="Allow multiple coupons per order"
              checked={settings.allowMultipleCoupons}
              onChange={(value) => setField("allowMultipleCoupons", value)}
            />
            <TextField
              id="f-max-discount"
              label="Maximum Discount Per Order (%)"
              type="number"
              value={settings.maxDiscountPercent}
              onChange={(value) => setField("maxDiscountPercent", value)}
              placeholder="50"
            />
            <ToggleField
              label="Coupon codes are case-sensitive"
              checked={settings.caseSensitiveCoupons}
              onChange={(value) => setField("caseSensitiveCoupons", value)}
            />
          </SectionCard>

          <SectionCard title="Automatic Discounts">
            <ToggleField
              label="Auto-apply best available discount"
              checked={settings.autoApplyBestDiscount}
              onChange={(value) => setField("autoApplyBestDiscount", value)}
            />
            <TextField
              id="f-min-order-coupon"
              label="Minimum Order Amount for Coupon Use"
              type="number"
              value={settings.minOrderAmountForCoupon}
              onChange={(value) => setField("minOrderAmountForCoupon", value)}
              placeholder="0"
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="tag"
            title="About Discounts & Coupons"
            points={[
              "Limiting coupons to one per order helps protect your margins.",
              "Auto-applying the best discount ensures customers always get the lowest eligible price.",
              "Case-sensitive codes can help reduce accidental duplicate redemptions.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
