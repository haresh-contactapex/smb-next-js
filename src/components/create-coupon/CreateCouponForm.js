"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { computeCouponStatus } from "@/lib/couponStatus";
import { DEFAULT_COUPON, buildCouponFromData, assembleCoupon } from "./helpers";
import PageToolbar from "./PageToolbar";
import CouponDetailsSection from "./CouponDetailsSection";
import DiscountValueSection from "./DiscountValueSection";
import UsageLimitsSection from "./UsageLimitsSection";
import ActiveDatesSidebar from "./ActiveDatesSidebar";
import EligibilitySidebar from "./EligibilitySidebar";
import Toast from "@/components/add-product/Toast";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function CreateCouponForm({ couponId, categories = [] }) {
  const isEdit = Boolean(couponId);
  const router = useRouter();
  const [coupon, setCoupon] = useState(DEFAULT_COUPON);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [valueError, setValueError] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const codeInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    if (!couponId) return;
    let cancelled = false;
    fetch(`/api/coupons/${couponId}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.error || "Failed to load coupon");
        setCoupon(buildCouponFromData(json.data));
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoading(false);
        showToast(error.message, "error");
      });
    return () => {
      cancelled = true;
    };
  }, [couponId]);

  // Status is always derived from the date range — recalculated on every
  // render, never stored or chosen manually.
  const effectiveEndDate = coupon.endDateEnabled ? coupon.endDate : "";
  const displayStatus = computeCouponStatus(coupon.startDate, effectiveEndDate);
  const dateRangeError = Boolean(effectiveEndDate && coupon.startDate && effectiveEndDate < coupon.startDate);

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

  // Changing the start date can invalidate an already-picked end date —
  // clear it rather than leave a range that no longer makes sense.
  function handleStartDateChange(value) {
    setCoupon((prev) => {
      const next = { ...prev, startDate: value };
      if (prev.endDateEnabled && prev.endDate && value && prev.endDate < value) {
        next.endDate = "";
      }
      return next;
    });
  }

  function handleEndDateChange(value) {
    setField("endDate", value);
  }

  function handleSave(e) {
    e?.preventDefault();

    const missingCode = !coupon.code.trim();
    const missingValue = coupon.type !== "free_shipping" && !String(coupon.value).trim();

    setCodeError(missingCode);
    setValueError(missingValue);

    if (missingCode || missingValue || dateRangeError) {
      if (missingCode) codeInputRef.current?.focus();
      showToast(
        dateRangeError && !missingCode && !missingValue
          ? "End date can't be before the start date"
          : "Fill in the required fields before saving",
        "error",
      );
      return;
    }

    persistCoupon();
  }

  async function persistCoupon() {
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/coupons/${couponId}` : "/api/coupons", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assembleCoupon(coupon)),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save coupon");

      showToast(isEdit ? "Coupon updated" : "Coupon saved");
      router.push("/all-coupons");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (isEdit) {
      if (!window.confirm("Discard changes and go back to All Coupons?")) return;
      router.push("/all-coupons");
      return;
    }
    if (!window.confirm("Discard all changes and start over?")) return;
    setCoupon(DEFAULT_COUPON);
    setCodeError(false);
    setValueError(false);
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-400">Loading coupon…</div>;
  }

  return (
    <form onSubmit={handleSave}>
      <PageToolbar isEdit={isEdit} saving={saving} onDiscard={handleDiscard} />

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
            status={displayStatus}
            startDate={coupon.startDate}
            endDateEnabled={coupon.endDateEnabled}
            endDate={coupon.endDate}
            dateRangeError={dateRangeError}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onFieldChange={setField}
          />

          <EligibilitySidebar
            appliesTo={coupon.appliesTo}
            categoryId={coupon.categoryId}
            categoryOptions={categories}
            onFieldChange={setField}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </form>
  );
}
