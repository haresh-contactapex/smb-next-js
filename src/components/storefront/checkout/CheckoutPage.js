"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import StoreIcon from "../icons";
import CheckoutSection from "./CheckoutSection";
import CheckoutStepper from "./CheckoutStepper";
import ContactStep from "./ContactStep";
import BillingStep from "./BillingStep";
import PaymentStep from "./PaymentStep";
import OrderSummary from "./OrderSummary";
import CheckoutSkeleton from "./CheckoutSkeleton";
import { CHECKOUT_CONTAINER, CHECKOUT_GRID } from "./checkoutStyles";
import { useCart } from "../cart/CartProvider";
import {
  CHECKOUT_STEPS,
  CHECKOUT_STORAGE_KEY,
  EMPTY_ADDRESS,
  EMPTY_CONTACT,
  checkoutTotals,
  formatAddress,
  sanitizeAddress,
  startingCheckout,
} from "./checkoutHelpers";

const STEP_IDS = CHECKOUT_STEPS.map((step) => step.id);

// What the visitor typed survives a trip to the cart (Edit Cart) and back, but
// only for this tab: personal details don't belong in long-lived storage.
function readSaved() {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(CHECKOUT_STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return null;
    const text = (source, defaults) =>
      Object.fromEntries(
        Object.entries(defaults).map(([key, fallback]) => [key, typeof fallback === "boolean" ? source?.[key] !== false : String(source?.[key] ?? fallback)])
      );
    const sameAsBilling = saved.sameAsBilling !== false;
    // `address` is what an earlier version saved: one address for both purposes.
    const billing = sanitizeAddress(text(saved.billing ?? saved.address, EMPTY_ADDRESS));
    const shipping = sameAsBilling ? billing : sanitizeAddress(text(saved.shipping, EMPTY_ADDRESS));
    return { contact: text(saved.contact, EMPTY_CONTACT), billing, shipping, sameAsBilling };
  } catch {
    return null;
  }
}

// The checkout: Contact -> Billing -> Payment as an accordion, beside the order
// summary. This component owns every step's values and which step is open; a
// step is only reachable once the one before it has been saved, and editing a
// saved step reopens the gate behind it.
//
// The Billing step holds two addresses. While "Same as billing address" is on,
// the shipping address is a copy of the billing one that follows every edit to it;
// turning it off leaves that copy in place to be edited on its own.
//
// `account` is the signed-in customer's details and saved addresses, or null for a
// guest. It only supplies starting values (see startingCheckout) and the Billing
// step's address pickers; everything is still validated as if it had been typed.
export default function CheckoutPage({ settings, account = null }) {
  const { items, hydrated, totals, shipping: cartShipping, countries } = useCart();
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [billingAddress, setBillingAddress] = useState(EMPTY_ADDRESS);
  const [shippingAddress, setShippingAddress] = useState(EMPTY_ADDRESS);
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [step, setStep] = useState("contact");
  const [done, setDone] = useState({ contact: false, billing: false });
  const [restored, setRestored] = useState(false);
  const addressPrefilled = useRef(false);

  useEffect(() => {
    const start = startingCheckout(readSaved(), account);
    setContact(start.contact);
    setBillingAddress(start.billing);
    setShippingAddress(start.shipping);
    setSameAsBilling(start.sameAsBilling);
    setRestored(true);
    // `account` comes from the server render and is fixed for this page view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start the addresses from the destination already chosen in the cart, or the store's first country.
  useEffect(() => {
    if (!restored || !hydrated || addressPrefilled.current) return;
    addressPrefilled.current = true;
    const fill = (current) =>
      current.country ? current : { ...current, country: cartShipping?.country || countries[0]?.name || "", zip: current.zip || cartShipping?.zip || "" };
    setBillingAddress(fill);
    setShippingAddress(fill);
  }, [restored, hydrated, cartShipping, countries]);

  useEffect(() => {
    if (!restored) return;
    try {
      window.sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify({ contact, billing: billingAddress, shipping: shippingAddress, sameAsBilling }));
    } catch {
      // Storage blocked (private mode): the form still works for this page view.
    }
  }, [restored, contact, billingAddress, shippingAddress, sameAsBilling]);

  const updateContact = useCallback((patch) => {
    setContact((current) => ({ ...current, ...patch }));
    setDone((current) => ({ ...current, contact: false }));
  }, []);

  // Editing the billing address also edits the shipping copy while "same as billing" is on.
  const updateBilling = useCallback(
    (patch) => {
      setBillingAddress((current) => ({ ...current, ...patch }));
      if (sameAsBilling) setShippingAddress((current) => ({ ...current, ...patch }));
      setDone((current) => ({ ...current, billing: false }));
    },
    [sameAsBilling]
  );

  const updateShipping = useCallback((patch) => {
    setShippingAddress((current) => ({ ...current, ...patch }));
    setDone((current) => ({ ...current, billing: false }));
  }, []);

  // Checking the box copies the billing address over; unchecking keeps that copy, now editable.
  const changeSameAsBilling = useCallback(
    (checked) => {
      setSameAsBilling(checked);
      if (checked) setShippingAddress(billingAddress);
      setDone((current) => ({ ...current, billing: false }));
    },
    [billingAddress]
  );

  const checkout = useMemo(() => checkoutTotals(totals, settings.tax), [totals, settings.tax]);

  const methods = settings.paymentMethods;
  const firstAvailable = methods.find((method) => !(method.minOrder > 0 && checkout.total < method.minOrder));
  const chosen = methods.find((method) => method.id === paymentMethod && !(method.minOrder > 0 && checkout.total < method.minOrder));
  const selectedMethod = chosen || firstAvailable || null;

  // The cart is read from localStorage after mount; show the skeleton rather than flash "empty" before then.
  if (!hydrated) return <CheckoutSkeleton />;

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <StoreIcon name="bag" className="h-12 w-12 text-gray-300" />
        <h1 className="text-[22px] font-semibold text-[#222222]">Your cart is empty</h1>
        <p className="text-[16px] text-[#555555]">Add something to your cart to check out.</p>
        <Link
          href="/women-wedding-bands"
          className="mt-2 rounded-lg bg-[#EF9822] px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#D9850F]"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const isLocked = (id) => STEP_IDS.slice(0, STEP_IDS.indexOf(id)).some((earlier) => !done[earlier]);
  const open = (id) => {
    if (!isLocked(id)) setStep(id);
  };

  const statuses = Object.fromEntries(STEP_IDS.map((id) => [id, id === step ? "current" : done[id] ? "complete" : "upcoming"]));
  const contactSummary = `${contact.firstName.trim()} ${contact.lastName.trim()} · ${contact.email.trim()}`;
  const billingSummary = sameAsBilling
    ? formatAddress(billingAddress)
    : `Billing: ${formatAddress(billingAddress)} · Shipping: ${formatAddress(shippingAddress)}`;

  return (
    <div className={CHECKOUT_CONTAINER}>
      <h1 className="sr-only">Checkout</h1>
      <div className={CHECKOUT_GRID}>
        <div>
          <CheckoutStepper steps={CHECKOUT_STEPS} statuses={statuses} />

          <div className="space-y-5">
            <CheckoutSection
              id="checkout-contact"
              title="Contact Information"
              subtitle="We'll use this email to send your order details"
              summary={contactSummary}
              open={step === "contact"}
              done={done.contact}
              onOpen={() => open("contact")}
            >
              <ContactStep
                contact={contact}
                showSignIn={!account}
                onChange={updateContact}
                onComplete={() => {
                  setDone((current) => ({ ...current, contact: true }));
                  setStep("billing");
                }}
              />
            </CheckoutSection>

            <CheckoutSection
              id="checkout-billing"
              title="Billing Information"
              subtitle="Add your billing and shipping addresses"
              summary={billingSummary}
              open={step === "billing"}
              done={done.billing}
              locked={isLocked("billing")}
              onOpen={() => open("billing")}
            >
              <BillingStep
                billing={billingAddress}
                shipping={shippingAddress}
                sameAsBilling={sameAsBilling}
                savedAddresses={account?.addresses || []}
                onBillingChange={updateBilling}
                onShippingChange={updateShipping}
                onSameChange={changeSameAsBilling}
                onComplete={() => {
                  setDone((current) => ({ ...current, billing: true }));
                  setStep("payment");
                }}
              />
            </CheckoutSection>

            <CheckoutSection
              id="checkout-payment"
              title="Payment Information"
              subtitle="Choose your preferred payment method"
              summary={selectedMethod?.label || ""}
              open={step === "payment"}
              done={false}
              locked={isLocked("payment")}
              onOpen={() => open("payment")}
            >
              <PaymentStep methods={methods} selected={selectedMethod?.id || ""} onSelect={setPaymentMethod} orderTotal={checkout.total} />
            </CheckoutSection>
          </div>
        </div>

        <OrderSummary checkout={checkout} tax={settings.tax} />
      </div>
    </div>
  );
}
