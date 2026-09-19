"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_ADDRESS_STATE, emptyAddressFromProfile, updateAddressField, validateAddressForm } from "./helpers";
import PageToolbar from "./PageToolbar";
import BillingAddressSection from "./BillingAddressSection";
import ShippingAddressSection from "./ShippingAddressSection";
import AddressPreviewSidebar from "./AddressPreviewSidebar";
import DeliveryInstructionsSidebar from "./DeliveryInstructionsSidebar";
import Toast from "./Toast";

function toFormAddress(saved, profile) {
  if (!saved) return emptyAddressFromProfile(profile);
  const { fullName, company, addressLine1, addressLine2, city, state, zip, country, phone } = saved;
  return { fullName, company, addressLine1, addressLine2, city, state, zip, country, phone };
}

export default function AddressForm() {
  const [state, setState] = useState(DEFAULT_ADDRESS_STATE);
  const [hasSavedBilling, setHasSavedBilling] = useState(false);
  const [hasSavedShipping, setHasSavedShipping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingErrors, setBillingErrors] = useState({});
  const [shippingErrors, setShippingErrors] = useState({});
  const [toast, setToast] = useState({ message: "", visible: false, variant: "success" });

  const toastTimerRef = useRef(null);
  const billingRefs = useRef({});
  const shippingRefs = useRef({});
  const profileRef = useRef(null);

  function registerBillingRef(field) {
    return (el) => {
      billingRefs.current[field] = el;
    };
  }

  function registerShippingRef(field) {
    return (el) => {
      shippingRefs.current[field] = el;
    };
  }

  function showToast(message, variant = "success") {
    setToast({ message, visible: true, variant });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function dismissToast() {
    clearTimeout(toastTimerRef.current);
    setToast((t) => ({ ...t, visible: false }));
  }

  async function loadAddresses() {
    setLoading(true);
    try {
      const [addressesRes, profileRes] = await Promise.all([fetch("/api/addresses"), fetch("/api/profile")]);
      const json = await addressesRes.json();
      if (!addressesRes.ok || !json.success) throw new Error(json.error || "Failed to load addresses");

      const profileJson = await profileRes.json();
      const profile = profileRes.ok && profileJson.success ? profileJson.data : null;
      profileRef.current = profile;

      const { billing, shipping } = json.data;
      setHasSavedBilling(Boolean(billing));
      setHasSavedShipping(Boolean(shipping));
      setBillingErrors({});
      setShippingErrors({});
      setState({
        billing: toFormAddress(billing, profile),
        shipping: toFormAddress(shipping, profile),
        shippingSameAsBilling: shipping ? Boolean(shipping.sameAsBilling) : true,
        deliveryInstructions: billing?.deliveryInstructions || shipping?.deliveryInstructions || "",
      });
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setBillingField(field, value) {
    setState((prev) => ({ ...prev, billing: updateAddressField(prev.billing, field, value) }));
    setBillingErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function setShippingField(field, value) {
    setState((prev) => ({ ...prev, shipping: updateAddressField(prev.shipping, field, value) }));
    setShippingErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function saveOne(type, address, sameAsBilling) {
    const res = await fetch("/api/addresses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...address, sameAsBilling, deliveryInstructions: state.deliveryInstructions }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || `Failed to save ${type} address`);
    return json.data;
  }

  async function handleSave() {
    const billingResult = validateAddressForm(state.billing);
    setBillingErrors(billingResult.errors);

    if (!billingResult.valid) {
      showToast(`Billing address: ${billingResult.message}`, "error");
      billingRefs.current[billingResult.firstErrorField]?.focus();
      return;
    }
    setShippingErrors({});

    if (!state.shippingSameAsBilling) {
      const shippingResult = validateAddressForm(state.shipping);
      setShippingErrors(shippingResult.errors);

      if (!shippingResult.valid) {
        showToast(`Shipping address: ${shippingResult.message}`, "error");
        shippingRefs.current[shippingResult.firstErrorField]?.focus();
        return;
      }
    }

    setSaving(true);
    try {
      await saveOne("billing", state.billing, false);
      setHasSavedBilling(true);

      const shippingToSave = state.shippingSameAsBilling ? state.billing : state.shipping;
      await saveOne("shipping", shippingToSave, state.shippingSameAsBilling);
      setHasSavedShipping(true);

      showToast("Address saved");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and reload your saved addresses?")) return;
    loadAddresses();
  }

  async function handleDeleteBilling() {
    if (!window.confirm("Remove the saved billing address?")) return;
    try {
      const res = await fetch("/api/addresses?type=billing", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to remove billing address");
      setState((prev) => ({ ...prev, billing: emptyAddressFromProfile(profileRef.current) }));
      setHasSavedBilling(false);
      setBillingErrors({});
      showToast("Billing address removed");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function handleDeleteShipping() {
    if (!window.confirm("Remove the saved shipping address?")) return;
    try {
      const res = await fetch("/api/addresses?type=shipping", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to remove shipping address");
      setState((prev) => ({ ...prev, shipping: emptyAddressFromProfile(profileRef.current) }));
      setHasSavedShipping(false);
      setShippingErrors({});
      showToast("Shipping address removed");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  return (
    <>
      <PageToolbar onDiscard={handleDiscard} onSave={handleSave} saving={saving} disabled={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <BillingAddressSection
            address={state.billing}
            onFieldChange={setBillingField}
            onDelete={handleDeleteBilling}
            hasSavedAddress={hasSavedBilling}
            errors={billingErrors}
            registerRef={registerBillingRef}
            onEnter={handleSave}
          />

          <ShippingAddressSection
            sameAsBilling={state.shippingSameAsBilling}
            address={state.shipping}
            onSameAsBillingChange={(checked) => setState((prev) => ({ ...prev, shippingSameAsBilling: checked }))}
            onFieldChange={setShippingField}
            onDelete={handleDeleteShipping}
            hasSavedAddress={hasSavedShipping}
            errors={shippingErrors}
            registerRef={registerShippingRef}
            onEnter={handleSave}
          />
        </div>

        <div className="space-y-6">
          <AddressPreviewSidebar
            billing={state.billing}
            shipping={state.shipping}
            shippingSameAsBilling={state.shippingSameAsBilling}
          />
          <DeliveryInstructionsSidebar
            value={state.deliveryInstructions}
            onChange={(value) => setState((prev) => ({ ...prev, deliveryInstructions: value }))}
          />
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </>
  );
}
