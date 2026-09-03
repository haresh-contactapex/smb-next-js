"use client";

import { useRef, useState } from "react";
import { DEFAULT_ADDRESS_STATE } from "./helpers";
import PageToolbar from "./PageToolbar";
import BillingAddressSection from "./BillingAddressSection";
import ShippingAddressSection from "./ShippingAddressSection";
import AddressPreviewSidebar from "./AddressPreviewSidebar";
import DeliveryInstructionsSidebar from "./DeliveryInstructionsSidebar";
import Toast from "./Toast";

export default function AddressForm() {
  const [state, setState] = useState(DEFAULT_ADDRESS_STATE);
  const [toast, setToast] = useState({ message: "", visible: false });

  const toastTimerRef = useRef(null);

  function showToast(message) {
    setToast({ message, visible: true });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }

  function setBillingField(field, value) {
    setState((prev) => ({ ...prev, billing: { ...prev.billing, [field]: value } }));
  }

  function setShippingField(field, value) {
    setState((prev) => ({ ...prev, shipping: { ...prev.shipping, [field]: value } }));
  }

  function handleSave() {
    if (!state.billing.addressLine1.trim() || !state.billing.city.trim()) {
      showToast("Add at least a street address and city before saving");
      return;
    }
    showToast("Address saved");
  }

  function handleDiscard() {
    if (!window.confirm("Discard all changes and start over?")) return;
    setState(DEFAULT_ADDRESS_STATE);
  }

  return (
    <>
      <PageToolbar onDiscard={handleDiscard} onSave={handleSave} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <BillingAddressSection address={state.billing} onFieldChange={setBillingField} />

          <ShippingAddressSection
            sameAsBilling={state.shippingSameAsBilling}
            address={state.shipping}
            onSameAsBillingChange={(checked) => setState((prev) => ({ ...prev, shippingSameAsBilling: checked }))}
            onFieldChange={setShippingField}
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

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
