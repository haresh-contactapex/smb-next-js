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
import { useCart } from "../cart/CartProvider";
import { CHECKOUT_STEPS, CHECKOUT_STORAGE_KEY, EMPTY_ADDRESS, EMPTY_CONTACT, checkoutTotals } from "./checkoutHelpers";

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
    return { contact: text(saved.contact, EMPTY_CONTACT), address: text(saved.address, EMPTY_ADDRESS) };
  } catch {
    return null;
  }
}

// The checkout: Contact -> Billing -> Payment as an accordion, beside the order
// summary. This component owns every step's values and which step is open; a
// step is only reachable once the one before it has been saved, and editing a
// saved step reopens the gate behind it.
export default function CheckoutPage({ settings }) {
  const { items, hydrated, totals, shipping, countries } = useCart();
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [step, setStep] = useState("contact");
  const [done, setDone] = useState({ contact: false, billing: false });
  const [restored, setRestored] = useState(false);
  const addressPrefilled = useRef(false);

  useEffect(() => {
    const saved = readSaved();
    if (saved) {
      setContact(saved.contact);
      setAddress(saved.address);
    }
    setRestored(true);
  }, []);

  // Start the address from the destination already chosen in the cart, or the store's first country.
  useEffect(() => {
    if (!restored || !hydrated || addressPrefilled.current) return;
    addressPrefilled.current = true;
    setAddress((current) =>
      current.country ? current : { ...current, country: shipping?.country || countries[0]?.name || "", zip: current.zip || shipping?.zip || "" }
    );
  }, [restored, hydrated, shipping, countries]);

  useEffect(() => {
    if (!restored) return;
    try {
      window.sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify({ contact, address }));
    } catch {
      // Storage blocked (private mode): the form still works for this page view.
    }
  }, [restored, contact, address]);

  const updateContact = useCallback((patch) => {
    setContact((current) => ({ ...current, ...patch }));
    setDone((current) => ({ ...current, contact: false }));
  }, []);

  const updateAddress = useCallback((patch) => {
    setAddress((current) => ({ ...current, ...patch }));
    setDone((current) => ({ ...current, billing: false }));
  }, []);

  const checkout = useMemo(() => checkoutTotals(totals, settings.tax), [totals, settings.tax]);

  const methods = settings.paymentMethods;
  const firstAvailable = methods.find((method) => !(method.minOrder > 0 && checkout.total < method.minOrder));
  const chosen = methods.find((method) => method.id === paymentMethod && !(method.minOrder > 0 && checkout.total < method.minOrder));
  const selectedMethod = chosen || firstAvailable || null;

  // The cart is read from localStorage after mount; don't flash "empty" before then.
  if (!hydrated) return <div className="min-h-[50vh] flex-1" aria-busy="true" />;

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <StoreIcon name="bag" className="h-12 w-12 text-gray-300" />
        <h1 className="text-[22px] font-semibold text-[#222222]">Your cart is empty</h1>
        <p className="text-[16px] text-[#555555]">Add something to your cart to check out.</p>
        <Link
          href="/women-wedding-bands"
          className="mt-2 rounded-lg bg-[#AF8C5A] px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#9B7A49]"
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
  const billingSummary = [address.line1.trim(), address.city.trim(), `${address.state.trim()} ${address.zip.trim()}`.trim()].filter(Boolean).join(", ");

  return (
    <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-14 pt-8 sm:px-8 lg:pt-10">
      <h1 className="sr-only">Checkout</h1>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-14">
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
              subtitle="Select or add a billing address"
              summary={billingSummary}
              open={step === "billing"}
              done={done.billing}
              locked={isLocked("billing")}
              onOpen={() => open("billing")}
            >
              <BillingStep
                address={address}
                onChange={updateAddress}
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
