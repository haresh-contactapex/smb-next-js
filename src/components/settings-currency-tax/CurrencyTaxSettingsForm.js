"use client";

import { useRef, useState } from "react";
import { CURRENCIES } from "@/data/accountData";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import SelectField from "@/components/settings-shared/SelectField";
import TextField from "@/components/settings-shared/TextField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/settings-shared/Toast";

const CURRENCY_POSITIONS = [
  { value: "before", label: "Before amount ($100.00)" },
  { value: "after", label: "After amount (100.00$)" },
];

const NUMBER_FORMATS = [
  { value: "1,234.56", label: "1,234.56" },
  { value: "1.234,56", label: "1.234,56" },
  { value: "1 234.56", label: "1 234.56" },
];

const DEFAULT_SETTINGS = {
  currency: "USD",
  currencyPosition: "before",
  numberFormat: "1,234.56",
  pricesIncludeTax: false,
  defaultTaxRate: "8.25",
  taxRegistrationNumber: "",
  applyTaxToShipping: true,
  enableTaxExemptGroups: false,
};

export default function CurrencyTaxSettingsForm() {
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
    showToast("Currency & tax settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <>
      <PageToolbar icon="dollar-sign" title="Currency & Tax" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Currency">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                id="f-currency"
                label="Default Currency"
                value={settings.currency}
                options={CURRENCIES}
                onChange={(value) => setField("currency", value)}
              />
              <SelectField
                id="f-currency-position"
                label="Currency Position"
                value={settings.currencyPosition}
                options={CURRENCY_POSITIONS}
                onChange={(value) => setField("currencyPosition", value)}
              />
            </div>
            <SelectField
              id="f-number-format"
              label="Number Format"
              value={settings.numberFormat}
              options={NUMBER_FORMATS}
              onChange={(value) => setField("numberFormat", value)}
            />
          </SectionCard>

          <SectionCard title="Tax">
            <ToggleField
              label="Prices include tax"
              description="Product prices are entered and displayed with tax already included."
              checked={settings.pricesIncludeTax}
              onChange={(value) => setField("pricesIncludeTax", value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-tax-rate"
                label="Default Tax Rate (%)"
                type="number"
                value={settings.defaultTaxRate}
                onChange={(value) => setField("defaultTaxRate", value)}
                placeholder="8.25"
              />
              <TextField
                id="f-tax-reg-number"
                label="Tax Registration Number"
                value={settings.taxRegistrationNumber}
                onChange={(value) => setField("taxRegistrationNumber", value)}
                placeholder="e.g. VAT / GST / EIN number"
              />
            </div>
            <ToggleField
              label="Apply tax to shipping"
              description="Charge tax on shipping and handling fees at checkout."
              checked={settings.applyTaxToShipping}
              onChange={(value) => setField("applyTaxToShipping", value)}
            />
            <ToggleField
              label="Enable tax-exempt customer groups"
              description="Allow specific customer groups (e.g. wholesale, non-profit) to be exempted from tax."
              checked={settings.enableTaxExemptGroups}
              onChange={(value) => setField("enableTaxExemptGroups", value)}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="dollar-sign"
            title="About Currency & Tax"
            points={[
              "The default currency is used for all storefront prices unless a customer's region overrides it.",
              "Tax rates set here are a fallback — per-region tax rules can still override them.",
              "Changing the currency does not convert existing product prices automatically.",
            ]}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
