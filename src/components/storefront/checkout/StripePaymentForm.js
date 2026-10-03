"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StoreIcon from "../icons";
import { useCart } from "../cart/CartProvider";
import { postJson } from "../cart/cartApi";
import { useGeneralSettings } from "@/components/providers/GeneralSettingsProvider";
import { toMinorUnits } from "@/lib/currency";
import { CHECKOUT_BUTTON } from "./checkoutStyles";
import { PHONE_COUNTRIES, phoneCountryOf } from "./checkoutHelpers";
import { loadStripeJs } from "./stripeClient";

// Matches the checkout: the storefront orange, the same radius as the fields.
const APPEARANCE = {
  theme: "stripe",
  variables: {
    colorPrimary: "#EF9822",
    colorText: "#333333",
    colorDanger: "#dc2626",
    fontFamily: "Google Sans, system-ui, sans-serif",
    borderRadius: "8px",
  },
};

// We collect the customer's name, email, phone and billing address ourselves, so the
// Payment Element is told not to ask for them again; they are handed to Stripe when
// the payment is confirmed.
const FIELDS = { billingDetails: { name: "never", email: "never", phone: "never", address: "never" } };

function billingDetails(order) {
  const { contact, billing } = order;
  const country = PHONE_COUNTRIES.find((candidate) => candidate.name === billing.country);
  return {
    name: `${contact.firstName} ${contact.lastName}`,
    email: contact.email,
    phone: `${phoneCountryOf(contact.phoneCountry).dial}${contact.phone.replace(/\D/g, "")}`,
    address: {
      line1: billing.line1,
      line2: billing.line2 || "",
      city: billing.city,
      state: billing.state,
      postal_code: billing.zip,
      country: country?.code || "",
    },
  };
}

// The card form and Place Order button of the payment step, built on Stripe's Payment
// Element (deferred-intent mode, so nothing is created until the customer presses the
// button). Pressing it:
//   1. asks the Element to validate what was typed,
//   2. sends the cart to our server, which prices it itself, saves the order and asks
//      Stripe for a PaymentIntent for exactly that total,
//   3. confirms that PaymentIntent with the card details, handling 3-D Secure,
//   4. goes to the confirmation page, which asks Stripe (not this browser) for the result.
// A failed card keeps the same order and intent, so a retry doesn't create a second order.
// `buildOrder()` returns the request body; `total` is what the customer is shown.
export default function StripePaymentForm({ stripe: config, active, total, buildOrder }) {
  const router = useRouter();
  const { currency } = useGeneralSettings();
  const { syncLines, removeCoupon } = useCart();

  const containerRef = useRef(null);
  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const attemptRef = useRef(null);
  const payingRef = useRef(false);
  const [loadState, setLoadState] = useState("idle"); // idle | loading | ready | failed
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const publishableKey = config?.publishableKey || "";
  const amount = toMinorUnits(total, currency);

  // Stripe.js and the card form are only fetched once the customer reaches this step.
  useEffect(() => {
    if (!active || !publishableKey || !containerRef.current) return undefined;

    let cancelled = false;
    let paymentElement = null;
    setLoadState("loading");

    loadStripeJs()
      .then((Stripe) => {
        if (cancelled || !containerRef.current) return;
        const stripe = Stripe(publishableKey);
        const elements = stripe.elements({ mode: "payment", amount, currency: currency.toLowerCase(), appearance: APPEARANCE });
        paymentElement = elements.create("payment", { layout: "tabs", fields: FIELDS });
        paymentElement.on("ready", () => setLoadState("ready"));
        paymentElement.on("loaderror", () => setLoadState("failed"));
        paymentElement.mount(containerRef.current);
        stripeRef.current = stripe;
        elementsRef.current = elements;
      })
      .catch(() => {
        if (!cancelled) setLoadState("failed");
      });

    return () => {
      cancelled = true;
      paymentElement?.destroy();
      stripeRef.current = null;
      elementsRef.current = null;
    };
    // `amount` is applied by the effect below; remounting the card form for it would wipe what was typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, publishableKey, currency]);

  // A coupon applied or a cart edited after the form is up changes the total it shows wallets.
  useEffect(() => {
    elementsRef.current?.update({ amount });
  }, [amount]);

  // What to do with a refusal from our server. Most are the cart or total having changed
  // since the page loaded; those bring the page up to date and ask the customer to look again.
  function explain(result) {
    if (result.reason === "cart_changed" && result.details?.lines) syncLines(result.details.lines);
    if (result.reason === "coupon_invalid") removeCoupon();
    // sign_in_required: guest checkout was switched off while the page was open, so re-render into the sign-in screen.
    if (result.reason === "total_changed" || result.reason === "sign_in_required") router.refresh();
    setMessage(result.error);
  }

  async function placeOrder() {
    if (payingRef.current) return;
    payingRef.current = true;
    setPaying(true);
    setMessage("");

    let redirected = false;
    try {
      const stripe = stripeRef.current;
      const elements = elementsRef.current;
      if (!stripe || !elements) return;

      const submitted = await elements.submit();
      if (submitted.error) {
        // The card form already shows what is wrong next to each field; this is the summary.
        setMessage("Please check your card details and try again.");
        return;
      }

      // The same cart and details reuse the same order and PaymentIntent, so a declined
      // card can be corrected and retried without leaving an abandoned order behind.
      const order = buildOrder();
      const signature = JSON.stringify(order);
      let attempt = attemptRef.current;
      if (!attempt || attempt.signature !== signature) {
        const created = await postJson("/api/checkout/payment", order);
        if (!created.ok) {
          explain(created);
          return;
        }
        attempt = { signature, ...created.data };
        attemptRef.current = attempt;
      }

      const confirmed = await stripe.confirmPayment({
        elements,
        clientSecret: attempt.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/complete?order=${encodeURIComponent(attempt.orderNumber)}`,
          payment_method_data: { billing_details: billingDetails(order) },
        },
        redirect: "if_required",
      });
      if (confirmed.error) {
        setMessage(confirmed.error.message || "Your payment couldn't be processed. Please try another card.");
        return;
      }

      // No redirect was needed (an ordinary card). The page we go to checks with Stripe.
      const intent = confirmed.paymentIntent;
      redirected = true;
      router.push(
        `/checkout/complete?order=${encodeURIComponent(attempt.orderNumber)}&payment_intent=${encodeURIComponent(intent.id)}&payment_intent_client_secret=${encodeURIComponent(intent.client_secret)}`
      );
    } catch {
      setMessage("Something went wrong while paying. You have not been charged. Please try again.");
    } finally {
      payingRef.current = false;
      // Stay "busy" while we navigate away, so the button can't be pressed twice.
      if (!redirected) setPaying(false);
    }
  }

  const ready = loadState === "ready";

  return (
    <div className="mt-6">
      {config?.mode === "test" && (
        <p className="mb-4 rounded-lg bg-[#FEF1DD] px-4 py-3 text-[13px] text-[#8A5000]">
          Test mode: no real money is taken. Pay with the test card 4242 4242 4242 4242, any future date and any CVC.
        </p>
      )}

      {/* The placeholder holds the height of the card form until it has loaded, then gets out of the way. */}
      <div className={`relative ${ready ? "" : "min-h-[170px]"}`}>
        {!ready && loadState !== "failed" && <div aria-hidden="true" className="shimmer absolute inset-0 z-10 rounded-lg" />}
        <div ref={containerRef} aria-label="Card details" className={loadState === "failed" ? "hidden" : ""} />
        {loadState === "failed" && (
          <p role="alert" className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-[14px] text-error">
            The secure card form couldn&apos;t be loaded. Check your connection and reload the page.
          </p>
        )}
      </div>

      <p role="alert" className="mt-4 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-[14px] text-error empty:hidden">
        {message}
      </p>

      <button type="button" onClick={placeOrder} disabled={!ready || paying} className={`${CHECKOUT_BUTTON} mt-6`}>
        {paying ? "Processing payment…" : "Place Order"}
        {!paying && <StoreIcon name="lockClosed" className="h-5 w-5" />}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[13px] text-[#9A9A9A]">
        Payments are processed securely by Stripe. We never see or store your card details.
      </p>
    </div>
  );
}
