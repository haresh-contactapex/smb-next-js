"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidEmail } from "@/components/auth/helpers";
import { DEFAULT_CUSTOMER, buildCustomerFromData, assembleCustomer } from "./helpers";
import PageToolbar from "./PageToolbar";
import CustomerDetailsSection from "./CustomerDetailsSection";
import AccountSettingsSidebar from "./AccountSettingsSidebar";
import Toast from "@/components/add-product/Toast";

// Keep in sync with AUTO_DISMISS_MS in the shared Add Product toast, which
// also drives the progress-bar animation for both success and error messages.
const TOAST_AUTO_DISMISS_MS = 10000;

export default function AddCustomerForm({ customerId }) {
  const isEdit = Boolean(customerId);
  const router = useRouter();
  const [customer, setCustomer] = useState(DEFAULT_CUSTOMER);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [firstNameError, setFirstNameError] = useState(false);
  const [lastNameError, setLastNameError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const firstNameInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    fetch(`/api/customers/${customerId}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.error || "Failed to load customer");
        setCustomer(buildCustomerFromData(json.data));
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
  }, [customerId]);

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
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  function handleFirstNameChange(value) {
    setField("firstName", value);
    setFirstNameError(false);
  }

  function handleLastNameChange(value) {
    setField("lastName", value);
    setLastNameError(false);
  }

  function handleEmailChange(value) {
    setField("email", value);
    setEmailError(false);
  }

  function handleSave(e) {
    e?.preventDefault();

    const missingFirstName = !customer.firstName.trim();
    const missingLastName = !customer.lastName.trim();
    const invalidEmail = !customer.email.trim() || !isValidEmail(customer.email);

    setFirstNameError(missingFirstName);
    setLastNameError(missingLastName);
    setEmailError(invalidEmail);

    if (missingFirstName || missingLastName || invalidEmail) {
      if (missingFirstName) firstNameInputRef.current?.focus();
      showToast("Fill in the required fields before saving", "error");
      return;
    }

    persistCustomer();
  }

  async function persistCustomer() {
    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/customers/${customerId}` : "/api/customers", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assembleCustomer(customer)),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save customer");

      showToast(isEdit ? "Customer updated" : "Customer saved");
      router.push("/all-customers");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (isEdit) {
      if (!window.confirm("Discard changes and go back to All Customers?")) return;
      router.push("/all-customers");
      return;
    }
    if (!window.confirm("Discard all changes and start over?")) return;
    setCustomer(DEFAULT_CUSTOMER);
    setFirstNameError(false);
    setLastNameError(false);
    setEmailError(false);
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-400">Loading customer…</div>;
  }

  return (
    <form onSubmit={handleSave}>
      <PageToolbar isEdit={isEdit} saving={saving} onDiscard={handleDiscard} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <CustomerDetailsSection
            firstName={customer.firstName}
            lastName={customer.lastName}
            firstNameError={firstNameError}
            lastNameError={lastNameError}
            firstNameInputRef={firstNameInputRef}
            email={customer.email}
            emailError={emailError}
            phone={customer.phone}
            onFirstNameChange={handleFirstNameChange}
            onLastNameChange={handleLastNameChange}
            onEmailChange={handleEmailChange}
            onPhoneChange={(value) => setField("phone", value)}
          />
        </div>

        <div className="space-y-6">
          <AccountSettingsSidebar
            customerGroup={customer.customerGroup}
            loyaltyPoints={customer.loyaltyPoints}
            acceptsMarketing={customer.acceptsMarketing}
            isGuest={customer.isGuest}
            createdAt={customer.createdAt}
            isEdit={isEdit}
            onFieldChange={setField}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </form>
  );
}
