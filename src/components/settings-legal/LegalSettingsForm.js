"use client";

import { useRef, useState } from "react";
import PageToolbar from "@/components/settings-shared/PageToolbar";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextField from "@/components/settings-shared/TextField";
import TextAreaField from "@/components/settings-shared/TextAreaField";
import ToggleField from "@/components/settings-shared/ToggleField";
import InfoSidebar from "@/components/settings-shared/InfoSidebar";
import Toast from "@/components/add-product/Toast";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

const DEFAULT_SETTINGS = {
  termsUrl: "",
  privacyUrl: "",
  refundUrl: "",
  shippingPolicyUrl: "",
  showCookieBanner: true,
  legalAddress: "",
};

const POLICY_URL_FIELDS = [
  { field: "termsUrl", label: "Terms of Service URL" },
  { field: "privacyUrl", label: "Privacy Policy URL" },
  { field: "refundUrl", label: "Refund Policy URL" },
  { field: "shippingPolicyUrl", label: "Shipping Policy URL" },
];
const LEGAL_SETTINGS_FIELD_ORDER = [...POLICY_URL_FIELDS.map(({ field }) => field), "legalAddress"];

function isValidPolicyUrl(value) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateLegalSettings(settings) {
  const errors = {};

  POLICY_URL_FIELDS.forEach(({ field, label }) => {
    if (!settings[field].trim()) {
      errors[field] = `Enter a ${label}.`;
    } else if (!isValidPolicyUrl(settings[field])) {
      errors[field] = `Enter a valid ${label} (for example, https://yourstore.com/policy).`;
    }
  });
  if (!settings.legalAddress.trim()) {
    errors.legalAddress = "Enter a business legal address.";
  }

  const firstErrorField = LEGAL_SETTINGS_FIELD_ORDER.find((field) => errors[field]);
  return {
    valid: !firstErrorField,
    errors,
    firstErrorField,
    message: firstErrorField ? errors[firstErrorField] : "",
  };
}

export default function LegalSettingsForm() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });
  const toastTimerRef = useRef(null);
  const fieldRefs = useRef({});

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      TOAST_AUTO_DISMISS_MS,
    );
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  function setField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handleSave() {
    const result = validateLegalSettings(settings);
    setErrors(result.errors);

    if (!result.valid) {
      showToast(result.message, "error");
      fieldRefs.current[result.firstErrorField]?.focus();
      return;
    }

    showToast("Legal settings saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setSettings(DEFAULT_SETTINGS);
    setErrors({});
  }

  return (
    <>
      <PageToolbar icon="file-text" title="Legal" onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Policies">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="f-terms-url"
                label="Terms of Service URL"
                type="url"
                value={settings.termsUrl}
                onChange={(value) => setField("termsUrl", value)}
                onEnter={handleSave}
                placeholder="https://yourstore.com/terms"
                error={errors.termsUrl}
                inputRef={(element) => {
                  fieldRefs.current.termsUrl = element;
                }}
              />
              <TextField
                id="f-privacy-url"
                label="Privacy Policy URL"
                type="url"
                value={settings.privacyUrl}
                onChange={(value) => setField("privacyUrl", value)}
                onEnter={handleSave}
                placeholder="https://yourstore.com/privacy"
                error={errors.privacyUrl}
                inputRef={(element) => {
                  fieldRefs.current.privacyUrl = element;
                }}
              />
              <TextField
                id="f-refund-url"
                label="Refund Policy URL"
                type="url"
                value={settings.refundUrl}
                onChange={(value) => setField("refundUrl", value)}
                onEnter={handleSave}
                placeholder="https://yourstore.com/refunds"
                error={errors.refundUrl}
                inputRef={(element) => {
                  fieldRefs.current.refundUrl = element;
                }}
              />
              <TextField
                id="f-shipping-policy-url"
                label="Shipping Policy URL"
                type="url"
                value={settings.shippingPolicyUrl}
                onChange={(value) => setField("shippingPolicyUrl", value)}
                onEnter={handleSave}
                placeholder="https://yourstore.com/shipping-policy"
                error={errors.shippingPolicyUrl}
                inputRef={(element) => {
                  fieldRefs.current.shippingPolicyUrl = element;
                }}
              />
            </div>
          </SectionCard>

          <SectionCard title="Compliance">
            <ToggleField
              label="Show cookie consent banner"
              checked={settings.showCookieBanner}
              onChange={(value) => setField("showCookieBanner", value)}
            />
            <TextAreaField
              id="f-legal-address"
              label="Business Legal Address"
              rows={2}
              value={settings.legalAddress}
              onChange={(value) => setField("legalAddress", value)}
              placeholder="123 Main St, Suite 100, Nashville, TN 37203"
              error={errors.legalAddress}
              inputRef={(element) => {
                fieldRefs.current.legalAddress = element;
              }}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <InfoSidebar
            icon="file-text"
            title="About Legal Settings"
            points={[
              "Policy URLs are linked from the storefront footer and checkout pages.",
              "The cookie consent banner helps meet regional privacy regulations like GDPR and CCPA.",
              "Your business legal address may be required for tax and compliance documents.",
            ]}
          />
        </div>
      </div>

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onDismiss={dismissToast}
      />
    </>
  );
}
