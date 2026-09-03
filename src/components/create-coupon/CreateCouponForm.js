"use client";

import { useRef, useState } from "react";
import { categories } from "@/data/categoriesData";
import { DEFAULT_COUPON } from "./helpers";
import PageToolbar from "./PageToolbar";
import CouponDetailsSection from "./CouponDetailsSection";
import DiscountValueSection from "./DiscountValueSection";
import UsageLimitsSection from "./UsageLimitsSection";
import ActiveDatesSidebar from "./ActiveDatesSidebar";
import EligibilitySidebar from "./EligibilitySidebar";
import Toast from "./Toast";

const CATEGORY_OPTIONS = categories.map((cat) => cat.name).sort();

export default function CreateCouponForm() {
  const [coupon, setCoupon] = useState(DEFAULT_COUPON);
  const [codeError, setCodeError] = useState(false);
  const [valueError, setValueError] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false });

  const codeInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  function showToast(message) {
    setToast({ message, visible: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function setField(field, value) {
    setCoupon((prev) => ({ ...prev, [field]: value }));
  }

  function handleCodeChange(value) {
    setField("code", value);
    setCodeError(false);
  }

  function handleTypeChange(value) {
    setCoupon((prev) => ({ ...prev, type: value, value: "" }));
    setValueError(false);
  }

  function handleValueChange(value) {
    setField("value", value);
    setValueError(false);
  }

  function handleSave() {
    let hasError = false;

    if (!coupon.code.trim()) {
      setCodeError(true);
      codeInputRef.current?.focus();
      hasError = true;
    } else {
      setCodeError(false);
    }

    if (coupon.type !== "free_shipping" && !String(coupon.value).trim()) {
      setValueError(true);
      hasError = true;
    } else {
      setValueError(false);
    }

    if (hasError) {
      showToast("Fill in the required fields before saving");
      return;
    }

    showToast("Coupon saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setCoupon(DEFAULT_COUPON);
    setCodeError(false);
    setValueError(false);
  }

  return (
    <>
      <PageToolbar onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <CouponDetailsSection
            code={coupon.code}
            codeError={codeError}
            codeInputRef={codeInputRef}
            description={coupon.description}
            type={coupon.type}
            onCodeChange={handleCodeChange}
            onDescriptionChange={(value) => setField("description", value)}
            onTypeChange={handleTypeChange}
          />

          <DiscountValueSection
            type={coupon.type}
            value={coupon.value}
            valueError={valueError}
            onValueChange={handleValueChange}
          />

          <UsageLimitsSection
            minPurchase={coupon.minPurchase}
            usageLimitEnabled={coupon.usageLimitEnabled}
            usageLimit={coupon.usageLimit}
            onePerCustomer={coupon.onePerCustomer}
            onFieldChange={setField}
          />
        </div>

        <div className="space-y-6">
          <ActiveDatesSidebar
            status={coupon.status}
            startDate={coupon.startDate}
            endDateEnabled={coupon.endDateEnabled}
            endDate={coupon.endDate}
            onFieldChange={setField}
          />

          <EligibilitySidebar
            appliesTo={coupon.appliesTo}
            category={coupon.category}
            categoryOptions={CATEGORY_OPTIONS}
            onFieldChange={setField}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
